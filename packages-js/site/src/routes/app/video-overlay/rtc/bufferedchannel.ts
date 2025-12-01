
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import type { PeerConnection } from './signaling';

type Entry = {
    id: number;
    offset: number;
    buffer: Uint8Array;
    to: PeerConnection;
};

const BUFFER_PACKET = {
    OPEN: 0,
    DATA: 1,
    CLOSE: 2,
};

export type ReservedChannel = {
    channel: BufferedDataChannel;
    attachReceiver: (connection: PeerConnection, channel: RTCDataChannel) => void;
    attachSender: (connection: PeerConnection, channel: RTCDataChannel) => void;
};

export class BufferedDataChannel {
    private entries: Array<Entry> = [];
    private chunkSize = 1024 * 16;
    private index = 0;
    private sender: Promise<void> | null = null;
    private handlers: Record<number, {
        buffer: Uint8Array;
        offset: number;
    }> = {};
    public onmessage: (from: PeerConnection, data: Uint8Array) => void = (data) => {
        console.log('unhandled message:', data);
    };
    private connections: Record<string, {
        channel?: RTCDataChannel;
        sendQueue: ArrayBuffer[];
    }> = {};

    private constructor(
        public readonly label: string,
        public sendData: (data: ArrayBuffer, to: PeerConnection) => void,
    ) { }

    public static reserve(label: string): ReservedChannel {
        const bufferedChannel = new BufferedDataChannel(label, async (data: ArrayBuffer, to) => {
            const conn = bufferedChannel.connections[to.id] ??= { sendQueue: [] };
            if (conn.channel && conn.channel.readyState === 'open') {
                await BufferedDataChannel.processQueue(conn.channel, conn.sendQueue);
                await this.waitForBufferedAmountLow(conn.channel);
                conn.channel.send(data);
            } else {
                conn.sendQueue.push(data);
            }
        });
        const attachReceiver = (connection: PeerConnection, channel: RTCDataChannel) => {
            channel.onmessage = (event) => {
                bufferedChannel.handleData(connection, event.data);
            };
            channel.onclose = () => {
                const conn = bufferedChannel.connections[connection.id] ??= { sendQueue: [] };
                conn.channel = undefined;
                conn.sendQueue = [];
            };
            channel.onerror = (event) => {
                console.error(connection.id, 'receiver', event);
            };
        };
        const attachSender = (connection: PeerConnection, channel: RTCDataChannel) => {
            channel.onopen = async () => {
                const conn = bufferedChannel.connections[connection.id] ??= { sendQueue: [] };
                conn.channel = channel;
                await BufferedDataChannel.processQueue(conn.channel, conn.sendQueue);
            };
            channel.onclose = () => {
                const conn = bufferedChannel.connections[connection.id] ??= { sendQueue: [] };
                conn.channel = undefined;
                conn.sendQueue = [];
            };
            channel.onerror = (event) => {
                console.error(connection.id, 'sender', event);
            };
            channel.onmessage = (event) => {
                bufferedChannel.handleData(connection, event.data);
            };
        };
        return {
            channel: bufferedChannel,
            attachReceiver,
            attachSender,
        };
    }

    private static async processQueue(channel: RTCDataChannel, sendQueue: ArrayBuffer[]) {
        const queue = sendQueue;
        while (queue.length) {
            const data = queue.shift();
            if (!data) break;
            await this.waitForBufferedAmountLow(channel);
            channel.send(data);
        }
    }

    private static async waitForBufferedAmountLow(channel: RTCDataChannel) {
        if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
            let waitForBufferedAmountLow = Promise.withResolvers<void>();
            channel.onbufferedamountlow = () => {
                waitForBufferedAmountLow.resolve();
            };
            await waitForBufferedAmountLow.promise;
            waitForBufferedAmountLow = Promise.withResolvers<void>();
        }
    }

    private async handleData(connection: PeerConnection, data: Uint8Array) {
        const reader = ByteReader.fromUint8Array(data);
        const type = reader.readUint8();
        const id = reader.readUint32();

        if (type === BUFFER_PACKET.OPEN) {
            const size = reader.readUint32();
            this.handlers[id] = {
                buffer: new Uint8Array(size),
                offset: 0,
            };
        } else if (type === BUFFER_PACKET.DATA) {
            const handle = this.handlers[id];
            const data = reader.readUint8Array();
            handle.buffer.set(data, handle.offset);
            handle.offset += data.length;
        } else if (type === BUFFER_PACKET.CLOSE) {
            const { buffer } = this.handlers[id];
            this.onmessage(connection, buffer);
            delete this.handlers[id];
        }
    }

    private sendEntry(entry: Entry) {
        const writer = new ByteWriter();
        writer.writeUint8(BUFFER_PACKET.OPEN);
        writer.writeUint32(entry.id);
        writer.writeUint32(entry.buffer.length);

        this.sendData(writer.toArrayBuffer(), entry.to);

        for (let offset = 0; offset < entry.buffer.length; offset += this.chunkSize) {
            const chunk = entry.buffer.slice(offset, offset + this.chunkSize);
            const chunkWriter = new ByteWriter();
            chunkWriter.writeUint8(BUFFER_PACKET.DATA);
            chunkWriter.writeUint32(entry.id);
            chunkWriter.writeUint8Array(chunk);

            this.sendData(chunkWriter.toArrayBuffer(), entry.to);
        }

        const closeWriter = new ByteWriter();
        closeWriter.writeUint8(BUFFER_PACKET.CLOSE);
        closeWriter.writeUint32(entry.id);

        this.sendData(closeWriter.toArrayBuffer(), entry.to);
    }

    private async sendLoop() {
        if (this.sender) return this.sender;

        const { promise: sender, resolve } = Promise.withResolvers<void>();
        this.sender = sender;

        try {
            while (this.entries.length > 0) {
                const entry = this.entries[0];
                this.sendEntry(entry);
                this.entries.shift();
            }
        } finally {
            this.sender = null;
            resolve();
        }
    }

    public send(data: Uint8Array, to: PeerConnection) {
        const id = this.index++;
        const entry: Entry = {
            id: id + performance.now(),
            offset: 0,
            buffer: data,
            to,
        };
        this.entries.push(entry);

        if (!this.sender) {
            this.sendLoop();
        }
    }
}

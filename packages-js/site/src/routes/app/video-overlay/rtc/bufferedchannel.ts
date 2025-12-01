import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import { AsyncQueue } from './queue';
import type { PeerConnection } from './signaling';

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
    private chunkSize = 1024 * 16;
    private nextMessageId = 0;
    private pendingMessages = new Map<number, {
        buffer: Uint8Array;
        received: number;
        connection: PeerConnection;
    }>();

    public onmessage: (from: PeerConnection, data: Uint8Array) => void = () => {};

    private connections = new Map<string, {
        channel?: RTCDataChannel;
        sendQueue: AsyncQueue<ArrayBuffer>;
        isSending: boolean;
    }>();

    private constructor(public readonly label: string) {}

    public static reserve(label: string): ReservedChannel {
        const channel = new BufferedDataChannel(label);

        const attachReceiver = (connection: PeerConnection, dataChannel: RTCDataChannel) => {
            dataChannel.onmessage = (event) => channel.handleData(connection, event.data);
            dataChannel.onclose = () => channel.removeConnection(connection.id);
        };

        const attachSender = (connection: PeerConnection, dataChannel: RTCDataChannel) => {
            const conn = channel.getOrCreateConnection(connection.id);
            conn.channel = dataChannel;

            dataChannel.onopen = () => channel.processSendQueue(connection.id);
            dataChannel.onclose = () => channel.removeConnection(connection.id);
            dataChannel.onmessage = (event) => channel.handleData(connection, event.data);
        };

        return { channel, attachReceiver, attachSender };
    }

    private getOrCreateConnection(connectionId: string) {
        let conn = this.connections.get(connectionId);
        if (!conn) {
            conn = {
                sendQueue: new AsyncQueue(),
                isSending: false,
            };
            this.connections.set(connectionId, conn);
        }
        return conn;
    }

    private removeConnection(connectionId: string) {
        const conn = this.connections.get(connectionId);
        if (conn) {
            conn.channel = undefined;
            conn.sendQueue = new AsyncQueue(); // Reset queue
        }
    }

    private async processSendQueue(connectionId: string) {
        const conn = this.connections.get(connectionId);
        if (!conn?.channel || conn.isSending || conn.channel.readyState !== 'open') {
            return;
        }

        conn.isSending = true;
        try {
            while (conn.sendQueue.length > 0 && conn.channel.readyState === 'open') {
                const data = await conn.sendQueue.pop();
                if (!data) break;

                // Wait if buffer is too full
                while (conn.channel.bufferedAmount > conn.channel.bufferedAmountLowThreshold) {
                    await new Promise<void>(resolve => {
                        conn.channel!.onbufferedamountlow = () => resolve();
                    });
                }

                conn.channel.send(data);
            }
        } finally {
            conn.isSending = false;
        }
    }

    private handleData(connection: PeerConnection, data: Uint8Array) {
        const reader = ByteReader.fromUint8Array(data);
        const type = reader.readUint8();
        const id = reader.readUint32();

        if (type === BUFFER_PACKET.OPEN) {
            const size = reader.readUint32();
            this.pendingMessages.set(id, {
                buffer: new Uint8Array(size),
                received: 0,
                connection,
            });
        } else if (type === BUFFER_PACKET.DATA) {
            const pending = this.pendingMessages.get(id);
            if (pending) {
                const chunk = reader.readUint8Array();
                pending.buffer.set(chunk, pending.received);
                pending.received += chunk.length;
            }
        } else if (type === BUFFER_PACKET.CLOSE) {
            const pending = this.pendingMessages.get(id);
            if (pending) {
                this.pendingMessages.delete(id);
                this.onmessage(pending.connection, pending.buffer);
            }
        }
    }

    private async sendToConnection(connectionId: string, data: ArrayBuffer) {
        const conn = this.getOrCreateConnection(connectionId);
        conn.sendQueue.push(data);
        await this.processSendQueue(connectionId);
    }

    public async send(data: Uint8Array, to: PeerConnection) {
        const messageId = this.nextMessageId++;
        const connectionId = to.id;

        // Send OPEN packet
        const openWriter = new ByteWriter();
        openWriter.writeUint8(BUFFER_PACKET.OPEN);
        openWriter.writeUint32(messageId);
        openWriter.writeUint32(data.length);
        await this.sendToConnection(connectionId, openWriter.toArrayBuffer());

        // Send DATA packets
        for (let offset = 0; offset < data.length; offset += this.chunkSize) {
            const chunk = data.slice(offset, offset + this.chunkSize);
            const chunkWriter = new ByteWriter();
            chunkWriter.writeUint8(BUFFER_PACKET.DATA);
            chunkWriter.writeUint32(messageId);
            chunkWriter.writeUint8Array(chunk);
            await this.sendToConnection(connectionId, chunkWriter.toArrayBuffer());
        }

        // Send CLOSE packet
        const closeWriter = new ByteWriter();
        closeWriter.writeUint8(BUFFER_PACKET.CLOSE);
        closeWriter.writeUint32(messageId);
        await this.sendToConnection(connectionId, closeWriter.toArrayBuffer());
    }
}

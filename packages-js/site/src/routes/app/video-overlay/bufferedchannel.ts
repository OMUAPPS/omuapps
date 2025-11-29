
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';

type Entry = {
    id: number;
    offset: number;
    buffer: Uint8Array;
};

const BUFFER_PACKET = {
    OPEN: 0,
    DATA: 1,
    CLOSE: 2,
};

export class BufferedDataChannel {
    private entries: Array<Entry> = [];
    private open = false;
    private chunkSize = 1024 * 16;
    private index = 0;
    private sender: Promise<void> | null = null;
    private waitConnected?: () => void = undefined;
    private handlers: Record<number, {
        buffer: Uint8Array;
        offset: number;
    }> = {};
    public onmessage: (data: Uint8Array) => void = () => {};

    private constructor(
        public readonly label: string,
        public readonly sendData: (data: ArrayBuffer) => Promise<void>,
    ) { }

    public static outgoing(connection: RTCPeerConnection, label: string) {
        const channel = connection.createDataChannel(label, {
            ordered: true,
        });
        const sendQueue: ArrayBuffer[] = [];
        let sendData = async (data: ArrayBuffer) => {
            sendQueue.push(data);
        };
        const bufferedChannel = new BufferedDataChannel(label, (data) => sendData(data));
        channel.addEventListener('open', async () => {
            bufferedChannel.open = true;
            bufferedChannel.waitConnected?.();
            sendData = async (data) => {
                await this.waitForBufferedAmountLow(channel);
                channel.send(data);
            };
            while (sendQueue.length) {
                const data = sendQueue.shift();
                if (!data) break;
                await this.waitForBufferedAmountLow(channel);
                channel.send(data);
            }
        });
        channel.onclose = () => {
            bufferedChannel.open = false;
        };
        channel.onmessage = (event) => {
            bufferedChannel.handleData(event.data);
        };
        return bufferedChannel;
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

    public attach(channel: RTCDataChannel) {
        channel.addEventListener('open', async () => {
            console.log('open', this.label);
            this.open = true;
            this.waitConnected?.();
        });
        channel.onclose = () => {
            this.open = false;
        };
        channel.onmessage = (event) => {
            this.handleData(event.data);
        };
        return this;
    }

    private async handleData(data: Uint8Array) {
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
            this.onmessage(buffer);
            delete this.handlers[id];
        }
    }

    private async sendEntry(entry: Entry) {
        if (!this.open) {
            const { promise, resolve } = Promise.withResolvers<void>();
            this.waitConnected = resolve;
            await promise;
        }

        const writer = new ByteWriter();
        writer.writeUint8(BUFFER_PACKET.OPEN);
        writer.writeUint32(entry.id);
        writer.writeUint32(entry.buffer.length);

        await this.sendData(writer.toArrayBuffer());

        for (let offset = 0; offset < entry.buffer.length; offset += this.chunkSize) {
            const chunk = entry.buffer.slice(offset, offset + this.chunkSize);
            const chunkWriter = new ByteWriter();
            chunkWriter.writeUint8(BUFFER_PACKET.DATA);
            chunkWriter.writeUint32(entry.id);
            chunkWriter.writeUint8Array(chunk);

            await this.sendData(chunkWriter.toArrayBuffer());
        }

        const closeWriter = new ByteWriter();
        closeWriter.writeUint8(BUFFER_PACKET.CLOSE);
        closeWriter.writeUint32(entry.id);

        await this.sendData(closeWriter.toArrayBuffer());
    }

    private async sendLoop() {
        if (this.sender) return this.sender;

        const { promise: sender, resolve } = Promise.withResolvers<void>();
        this.sender = sender;

        try {
            while (this.entries.length > 0) {
                const entry = this.entries[0];
                await this.sendEntry(entry);
                this.entries.shift();
            }
        } finally {
            this.sender = null;
            resolve();
        }
    }

    public send(data: Uint8Array) {
        const id = this.index++;
        const entry: Entry = {
            id: id + performance.now(),
            offset: 0,
            buffer: data,
        };
        this.entries.push(entry);

        if (!this.sender) {
            this.sendLoop();
        }
    }
}

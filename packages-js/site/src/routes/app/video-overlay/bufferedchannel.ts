
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
    private opened = false;
    private chunkSize = 1024 * 16;
    private index = 0;
    private sender: Promise<void> | null = null;
    private handlers: Record<number, {
        buffer: Uint8Array;
        offset: number;
    }> = {};
    public onmessage: (data: Uint8Array) => void = () => {};
    public onopen: () => void = () => {};
    public onclose: () => void = () => {};

    constructor(
        public readonly channel: RTCDataChannel,
    ) {
        channel.onopen = () => {
            this.opened = true;
            this.onopen();
        };
        channel.onclose = () => {
            this.opened = false;
            this.onclose();
        };
        channel.onmessage = (event) => {
            this.handleData(event.data);
        };
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
        }
    }

    // https://github.com/kadoshita/webrtc-datachannel-efficient/blob/2c1b3c885f35f7eecbb9c45f30c17bc9e3063676/main.ts#L114C62-L135C6
    private async sendLoop() {
        if (this.sender) return this.sender;
        const { promise: sender, resolve } = Promise.withResolvers<void>();
        this.sender = sender;
        let waitForBufferedAmountLow = Promise.withResolvers<void>();
        this.channel.onbufferedamountlow = () => {
            waitForBufferedAmountLow.resolve();
        };
        while (this.entries.length) {
            const entry = this.entries.shift();
            if (!entry) break;
            const writer = new ByteWriter();
            writer.writeUint8(BUFFER_PACKET.OPEN);
            writer.writeUint32(entry.id);
            writer.writeUint32(entry.buffer.length);
            this.channel.send(writer.toArrayBuffer());
            for (let offset = 0; offset < entry.buffer.length; offset += this.chunkSize) {
                const chunk = entry.buffer.slice(offset, offset + this.chunkSize);
                const chunkWriter = new ByteWriter();
                chunkWriter.writeUint8(BUFFER_PACKET.DATA);
                chunkWriter.writeUint32(entry.id);
                chunkWriter.writeUint8Array(chunk);
                this.channel.send(chunkWriter.toArrayBuffer());
                if (this.channel.bufferedAmount > this.channel.bufferedAmountLowThreshold) {
                    await waitForBufferedAmountLow.promise;
                    waitForBufferedAmountLow = Promise.withResolvers<void>();
                }
            }
            const closeWriter = new ByteWriter();
            closeWriter.writeUint8(BUFFER_PACKET.CLOSE);
            closeWriter.writeUint32(entry.id);
            this.channel.send(closeWriter.toArrayBuffer());
        }
        this.sender = null;
        resolve();
    }

    public send(data: Uint8Array) {
        const id = this.index ++;
        const entry: Entry = {
            id,
            offset: 0,
            buffer: data,
        };
        this.entries.push(entry);
        this.sendLoop();
    }
}

import { textDecoder, textEncoder } from './const.js';

export class Flags {
    private value: number;
    private length: number;

    constructor(options: { value?: number, length?: number }) {
        this.value = options.value ?? 0;
        this.length = options.length ?? 32;
    }

    public has(position: number): boolean {
        return (this.value & (1 << position)) !== 0;
    }

    public get(position: number): boolean {
        return (this.value & (1 << position)) !== 0;
    }

    public ifSet<T>(position: number, callback: () => T): T | undefined {
        if (this.has(position)) {
            return callback();
        }
        return undefined;
    }

    public set(position: number, value: boolean): void {
        if (value) {
            this.value |= 1 << position;
        } else {
            this.value &= ~(1 << position);
        }
    }

    public write(writer: ByteWriter): void {
        const bits = new Uint8Array((this.length + 7) / 8);
        for (let i = 0; i < bits.length; i++) {
            bits[i] = (this.value >> (i * 8)) & 0xff;
        }
        writer.write(bits);
    }

    public static read(reader: ByteReader, length: number): Flags {
        let value = 0;
        for (let i = 0; i < (length + 7) / 8; i++) {
            value |= reader.readByte() << (i * 8);
        }
        return new Flags({ value, length });
    }
}

export class ByteWriter {
    private dataArray: DataView;
    private buffer: ArrayBuffer;
    private offset = 0;
    private finished = false;

    constructor(init?: ArrayBuffer) {
        this.buffer = init ?? new ArrayBuffer(1024);
        this.dataArray = new DataView(this.buffer);
    }

    private allocate(length: number): void {
        if (this.offset + length > this.buffer.byteLength) {
            const newByteLength = Math.max(this.buffer.byteLength * 2, this.offset + length);
            const newBuffer = new ArrayBuffer(newByteLength);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.dataArray = new DataView(this.buffer);
        }
    }

    public write(data: Uint8Array): ByteWriter {
        if (this.finished) {
            throw new Error('Buffer already finished');
        }
        this.allocate(data.length);
        new Uint8Array(this.buffer).set(data, this.offset);
        this.offset += data.length;
        return this;
    }

    public writeBoolean(value: boolean): ByteWriter {
        this.allocate(1);
        this.dataArray.setInt8(this.offset, value ? 1 : 0);
        this.offset += 1;
        return this;
    }

    public writeBigInt(value: bigint): ByteWriter {
        this.allocate(8);
        this.dataArray.setBigInt64(this.offset, value);
        this.offset += 8;
        return this;
    }

    public writeInt(value: number): ByteWriter {
        this.allocate(4);
        this.dataArray.setInt32(this.offset, value);
        this.offset += 4;
        return this;
    }

    public writeShort(value: number): ByteWriter {
        this.allocate(2);
        this.dataArray.setInt16(this.offset, value);
        this.offset += 2;
        return this;
    }

    public writeByte(value: number): ByteWriter {
        this.allocate(1);
        this.dataArray.setInt8(this.offset, value);
        this.offset += 1;
        return this;
    }

    public writeByteArray(value: Uint8Array): ByteWriter {
        if (value.byteLength > 0x7fffffff) {
            throw new Error('Byte array too long');
        }
        this.writeInt(value.byteLength);
        this.write(value);
        return this;
    }

    public writeString(value: string): ByteWriter {
        this.writeByteArray(textEncoder.encode(value));
        return this;
    }

    public writeFlags(flags: Flags): ByteWriter {
        flags.write(this);
        return this;
    }

    public finish(): Uint8Array {
        if (this.finished) {
            throw new Error('Buffer already finished');
        }
        this.finished = true;
        return new Uint8Array(this.buffer, 0, this.offset);
    }
}

export class ByteReader {
    private dataArray: DataView;
    private offset: number;
    private finished: boolean;

    private constructor(data: DataView) {
        this.dataArray = data;
        this.offset = 0;
        this.finished = false;
    }

    public static fromUint8Array(buffer: Uint8Array): ByteReader {
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        const uint8Array = new Uint8Array(arrayBuffer);
        uint8Array.set(new Uint8Array(buffer));
        const dataView = new DataView(arrayBuffer);
        return new ByteReader(dataView);
    }

    public static fromArrayBuffer(buffer: ArrayBuffer): ByteReader {
        const dataView = new DataView(buffer);
        return new ByteReader(dataView);
    }

    public  static async fromBlob(blob: Blob): Promise<ByteReader> {
        const arrayBuffer = await blob.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        return new ByteReader(dataView);
    }

    public read(size: number): Uint8Array {
        if (this.finished) {
            throw new Error('Buffer already finished');
        }
        if (size < 0) {
            throw new Error('Size must be positive');
        }
        if (this.offset + size > this.dataArray.byteLength) {
            throw new Error('Buffer not fully read');
        }
        const value = new Uint8Array(this.dataArray.buffer, this.offset, size);
        this.offset += size;
        return value;
    }

    public readBoolean(): boolean {
        const value = this.dataArray.getInt8(this.offset);
        this.offset += 1;
        return value !== 0;
    }

    public readBigInt(): bigint {
        const value = this.dataArray.getBigInt64(this.offset);
        this.offset += 8;
        return value;
    }

    public readInt(): number {
        const value = this.dataArray.getInt32(this.offset);
        this.offset += 4;
        return value;
    }

    public readShort(): number {
        const value = this.dataArray.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    public readByte(): number {
        const value = this.dataArray.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    public readByteArray(): Uint8Array {
        const length = this.readInt();
        return this.read(length);
    }

    public readString(): string {
        return textDecoder.decode(this.readByteArray());
    }

    public readFlags(length: number): Flags {
        return Flags.read(this, length);
    }

    public finish(): void {
        if (this.finished) {
            throw new Error('Buffer already finished');
        }
        this.finished = true;
        if (this.offset !== this.dataArray.byteLength) {
            throw new Error('Buffer not fully read');
        }
    }
}

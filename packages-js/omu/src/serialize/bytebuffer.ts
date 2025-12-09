import { textDecoder, textEncoder } from '../const.js';
import { JsonType } from './serializer.js';

export class Flags {
    private value: number;
    private length: number;

    constructor(options: { value?: number; length?: number }) {
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
            value |= reader.readUint8() << (i * 8);
        }
        return new Flags({ value, length });
    }
}

function readFloat16(dataView: DataView, offset: number): number {
    const sign = (dataView.getUint16(offset) & 0x8000) ? -1 : 1;
    const exponent = (dataView.getUint16(offset) & 0x7c00) >> 10;
    const mantissa = (dataView.getUint16(offset) & 0x03ff);
    if (exponent === 0 && mantissa === 0) {
        return 0;
    } else if (exponent === 0x1f) {
        return mantissa === 0 ? Infinity * sign : NaN;
    } else {
        const normalizedExponent = exponent - 15;
        const normalizedMantissa = mantissa / 1024;
        return sign * Math.pow(2, normalizedExponent) * (1 + normalizedMantissa);
    }
}

function writeFloat16(dataView: DataView, offset: number, value: number): void {
    if (value === 0) {
        dataView.setUint16(offset, 0);
        return;
    }
    const sign = value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (!isFinite(value)) {
        dataView.setUint16(offset, 0x7c00 | (sign << 15));
        return;
    }
    const exponent = Math.floor(Math.log2(value));
    const mantissa = value / Math.pow(2, exponent) - 1;
    const normalizedExponent = exponent + 15;
    const normalizedMantissa = Math.round(mantissa * 1024);
    if (normalizedExponent <= 0) {
        dataView.setUint16(offset, sign << 15);
    } else if (normalizedExponent >= 0x1f) {
        dataView.setUint16(offset, 0x7c00 | (sign << 15));
    } else {
        dataView.setUint16(offset, (sign << 15) | (normalizedExponent << 10) | normalizedMantissa);
    }
}

export class ByteWriter {
    private dataView: DataView;
    private buffer: ArrayBuffer;
    private offset = 0;
    private finished = false;

    constructor(init?: ArrayBuffer, offset?: number) {
        this.offset = offset ?? 0;
        this.buffer = init ?? new ArrayBuffer(1024);
        this.dataView = new DataView(this.buffer);
    }

    public static fromUint8Array(buffer: Uint8Array): ByteWriter {
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        const uint8Array = new Uint8Array(arrayBuffer);
        uint8Array.set(new Uint8Array(buffer));
        return new ByteWriter(arrayBuffer, buffer.byteLength);
    }

    private allocate(length: number): void {
        if (this.offset + length > this.buffer.byteLength) {
            const newByteLength = Math.max(this.buffer.byteLength * 2, this.offset + length);
            const newBuffer = new ArrayBuffer(newByteLength);
            new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.dataView = new DataView(this.buffer);
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
        this.dataView.setInt8(this.offset, value ? 1 : 0);
        this.offset += 1;
        return this;
    }

    public writeInt8(value: number): ByteWriter {
        this.allocate(1);
        this.dataView.setInt8(this.offset, value);
        this.offset += 1;
        return this;
    }

    public writeUint8(value: number): ByteWriter {
        this.allocate(1);
        this.dataView.setUint8(this.offset, value);
        this.offset += 1;
        return this;
    }

    public writeInt16(value: number): ByteWriter {
        this.allocate(2);
        this.dataView.setInt16(this.offset, value);
        this.offset += 2;
        return this;
    }

    public writeUint16(value: number): ByteWriter {
        this.allocate(2);
        this.dataView.setUint16(this.offset, value);
        this.offset += 2;
        return this;
    }

    public writeInt32(value: number): ByteWriter {
        this.allocate(4);
        this.dataView.setInt32(this.offset, value);
        this.offset += 4;
        return this;
    }

    public writeUint32(value: number): ByteWriter {
        this.allocate(4);
        this.dataView.setUint32(this.offset, value);
        this.offset += 4;
        return this;
    }

    public writeInt64(value: bigint): ByteWriter {
        this.allocate(8);
        this.dataView.setBigInt64(this.offset, value);
        this.offset += 8;
        return this;
    }

    public writeUint64(value: bigint): ByteWriter {
        this.allocate(8);
        this.dataView.setBigUint64(this.offset, value);
        this.offset += 8;
        return this;
    }

    public writeULEB128(value: number): ByteWriter {
        // Unsigned LEB128
        if (value < 0) {
            throw new Error('Value must be non-negative');
        }
        while (value > 0x7f) {
            this.allocate(1);
            this.dataView.setUint8(this.offset, (value & 0x7f) | 0x80);
            this.offset += 1;
            value >>= 7;
        }
        this.allocate(1);
        this.dataView.setUint8(this.offset, value & 0x7f);
        this.offset += 1;
        return this;
    }

    public writeFloat16(value: number): ByteWriter {
        this.allocate(2);
        writeFloat16(this.dataView, this.offset, value);
        this.offset += 2;
        return this;
    }

    public writeFloat32(value: number): ByteWriter {
        this.allocate(4);
        this.dataView.setFloat32(this.offset, value);
        this.offset += 4;
        return this;
    }

    public writeFloat64(value: number): ByteWriter {
        this.allocate(4);
        this.dataView.setFloat64(this.offset, value);
        this.offset += 4;
        return this;
    }

    public writeUint8Array(value: Uint8Array): ByteWriter {
        this.writeULEB128(value.byteLength);
        this.write(value);
        return this;
    }

    public writeString(value: string): ByteWriter {
        this.writeUint8Array(textEncoder.encode(value));
        return this;
    }

    public writeJSON(value: JsonType): ByteWriter {
        this.writeString(JSON.stringify(value));
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

    public toUint8Array(): Uint8Array {
        return new Uint8Array(this.buffer, 0, this.offset);
    }

    public toArrayBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.offset);
    }
}

export class ByteReader {
    private dataView: DataView;
    private offset: number;
    private finished: boolean;

    private constructor(data: DataView) {
        this.dataView = data;
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

    public static async fromBlob(blob: Blob): Promise<ByteReader> {
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
        if (this.offset + size > this.dataView.byteLength) {
            throw new Error('Buffer not fully read');
        }
        const value = new Uint8Array(this.dataView.buffer, this.offset, size);
        this.offset += size;
        return value;
    }

    public readBoolean(): boolean {
        const value = this.dataView.getInt8(this.offset);
        this.offset += 1;
        return value !== 0;
    }

    public readInt8(): number {
        const value = this.dataView.getInt8(this.offset);
        this.offset += 1;
        return value;
    }

    public readUint8(): number {
        const value = this.dataView.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    public readInt16(): number {
        const value = this.dataView.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    public readUint16(): number {
        const value = this.dataView.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    public readInt32(): number {
        const value = this.dataView.getInt32(this.offset);
        this.offset += 4;
        return value;
    }

    public readUint32(): number {
        const value = this.dataView.getUint32(this.offset);
        this.offset += 4;
        return value;
    }

    public readInt64(): bigint {
        const value = this.dataView.getBigInt64(this.offset);
        this.offset += 8;
        return value;
    }

    public readUint64(): bigint {
        const value = this.dataView.getBigUint64(this.offset);
        this.offset += 8;
        return value;
    }

    public readULEB128(): number {
        // Unsigned LEB128
        let value = 0;
        let shift = 0;
        let byte: number;
        do {
            if (this.offset >= this.dataView.byteLength) {
                throw new Error('Buffer not fully read');
            }
            byte = this.dataView.getUint8(this.offset);
            this.offset += 1;
            value |= (byte & 0b01111111) << shift;
            shift += 7;
        }
        while ((byte & 0b10000000) !== 0);
        return value;
    }

    public readFloat16(): number {
        const value = readFloat16(this.dataView, this.offset);
        this.offset += 2;
        return value;
    }

    public readFloat32(): number {
        const value = this.dataView.getFloat32(this.offset);
        this.offset += 4;
        return value;
    }

    public readFloat64(): number {
        const value = this.dataView.getFloat64(this.offset);
        this.offset += 8;
        return value;
    }

    public readUint8Array(): Uint8Array {
        const length = this.readULEB128();
        return this.read(length);
    }

    public readString(): string {
        const byteArray = this.readUint8Array();
        return textDecoder.decode(byteArray);
    }

    public readJSON<T extends JsonType>(): T {
        return JSON.parse(this.readString());
    }

    public readFlags(length: number): Flags {
        return Flags.read(this, length);
    }

    public finish(): void {
        if (this.finished) {
            throw new Error('Buffer already finished');
        }
        this.finished = true;
        if (this.offset !== this.dataView.byteLength) {
            throw new Error('Buffer not fully read');
        }
    }
}

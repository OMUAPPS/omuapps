import { describe, expect, test } from 'bun:test';
import { ByteReader, ByteWriter, Flags } from '../src/serialize';

describe('Flags', () => {
    test.each([1, 2, 8, 9, 16])('writes and reads %i bits in whole bytes', (length) => {
        const flags = new Flags({ length });
        flags.set(0, true);
        flags.set(length - 1, true);
        const data = new ByteWriter().writeFlags(flags).writeString('next').finish();
        expect(data.byteLength).toBe(Math.ceil(length / 8) + 5);
        const reader = ByteReader.fromUint8Array(data);
        const read = reader.readFlags(length);
        expect(read.get(0)).toBe(true);
        expect(read.get(length - 1)).toBe(true);
        expect(reader.readString()).toBe('next');
    });
});

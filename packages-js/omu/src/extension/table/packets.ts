import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Identifier } from '../../identifier.js';

import type { TableConfig } from './table.js';

export class TablePacket {
    constructor(public readonly id: Identifier) {}

    public static serialize(packet: TablePacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TablePacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        return new TablePacket(id);
    }
}

export class TableItemsPacket {
    constructor(
        public readonly id: Identifier,
        public readonly items: Record<string, Uint8Array>,
    ) {}

    public static serialize(packet: TableItemsPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeInt(Object.keys(packet.items).length);
        for (const [key, value] of Object.entries(packet.items)) {
            writer.writeString(key);
            writer.writeByteArray(value);
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TableItemsPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const count = reader.readInt();
        const items: Record<string, Uint8Array> = {};
        for (let i = 0; i < count; i++) {
            const key = reader.readString();
            const value = reader.readByteArray();
            items[key] = value;
        }
        return new TableItemsPacket(id, items);
    }
}

export class TableKeysPacket {
    constructor(
        public readonly id: Identifier,
        public readonly keys: string[],
    ) {}

    public static serialize(packet: TableKeysPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeInt(packet.keys.length);
        for (const key of packet.keys) {
            writer.writeString(key);
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TableKeysPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const count = reader.readInt();
        const keys: string[] = [];
        for (let i = 0; i < count; i++) {
            keys.push(reader.readString());
        }
        return new TableKeysPacket(id, keys);
    }
}

export class TableProxyPacket {
    constructor(
        public readonly id: Identifier,
        public readonly items: Record<string, Uint8Array>,
        public readonly key: number,
    ) {}

    public static serialize(packet: TableProxyPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeInt(packet.key);
        writer.writeInt(Object.keys(packet.items).length);
        for (const [key, value] of Object.entries(packet.items)) {
            writer.writeString(key);
            writer.writeByteArray(value);
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TableProxyPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const key = reader.readInt();
        const count = reader.readInt();
        const items: Record<string, Uint8Array> = {};
        for (let i = 0; i < count; i++) {
            const key = reader.readString();
            const value = reader.readByteArray();
            items[key] = value;
        }
        return new TableProxyPacket(id, items, key);
    }
}
export class TableFetchPacket {
    constructor(
        public readonly id: Identifier,
        public readonly before: number | null,
        public readonly after: number | null,
        public readonly cursor: string | null,
    ) {}

    public static serialize(packet: TableFetchPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        let flags = 0;
        if (packet.before !== null) {
            flags |= 0b1;
        }
        if (packet.after !== null) {
            flags |= 0b10;
        }
        if (packet.cursor !== null) {
            flags |= 0b100;
        }
        writer.writeByte(flags);
        if (packet.before !== null) {
            writer.writeInt(packet.before);
        }
        if (packet.after !== null) {
            writer.writeInt(packet.after);
        }
        if (packet.cursor !== null) {
            writer.writeString(packet.cursor);
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TableFetchPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const flags = reader.readByte();
        const before = flags & 0b1 ? reader.readInt() : null;
        const after = flags & 0b10 ? reader.readInt() : null;
        const cursor = flags & 0b100 ? reader.readString() : null;
        return new TableFetchPacket(id, before, after, cursor);
    }
}

export class TableFetchRangePacket {
    constructor(
        public readonly id: Identifier,
        public readonly start: string,
        public readonly end: string,
    ) {}

    public static serialize(packet: TableFetchRangePacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeString(packet.start);
        writer.writeString(packet.end);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): TableFetchRangePacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const start = reader.readString();
        const end = reader.readString();
        return new TableFetchRangePacket(id, start, end);
    }
}

export class SetConfigPacket {
    constructor(
        public readonly id: Identifier,
        public readonly config: TableConfig,
    ) {}

    public static serialize(packet: SetConfigPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeString(JSON.stringify(packet.config));
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): SetConfigPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const config = JSON.parse(reader.readString());
        return new SetConfigPacket(id, config);
    }
}

export class SetPermissionPacket {
    constructor(
        public readonly id: Identifier,
        public readonly all: Identifier | null,
        public readonly read: Identifier | null,
        public readonly write: Identifier | null,
        public readonly remove: Identifier | null,
        public readonly proxy: Identifier | null,
    ) {}

    public static serialize(packet: SetPermissionPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        let flags = 0;
        if (packet.all !== null) {
            flags |= 0b1;
        }
        if (packet.read !== null) {
            flags |= 0b10;
        }
        if (packet.write !== null) {
            flags |= 0b100;
        }
        if (packet.remove !== null) {
            flags |= 0b1000;
        }
        if (packet.proxy !== null) {
            flags |= 0b10000;
        }
        writer.writeByte(flags);
        if (packet.all) {
            writer.writeString(packet.all.key());
        }
        if (packet.read) {
            writer.writeString(packet.read.key());
        }
        if (packet.write) {
            writer.writeString(packet.write.key());
        }
        if (packet.remove) {
            writer.writeString(packet.remove.key());
        }
        if (packet.proxy) {
            writer.writeString(packet.proxy.key());
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): SetPermissionPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const flags = reader.readByte();
        const all = flags & 0b1 ? Identifier.fromKey(reader.readString()) : null;
        const read = flags & 0b10 ? Identifier.fromKey(reader.readString()) : null;
        const write = flags & 0b100 ? Identifier.fromKey(reader.readString()) : null;
        const remove = flags & 0b1000 ? Identifier.fromKey(reader.readString()) : null;
        const proxy = flags & 0b10000 ? Identifier.fromKey(reader.readString()) : null;
        return new SetPermissionPacket(id, all, read, write, remove, proxy);
    }
}

import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Identifier, IdentifierMap } from '../../identifier.js';

export class EndpointRegisterPacket {
    constructor(
        public endpoints: IdentifierMap<Identifier | undefined>,
    ) { }

    public static serialize(item: EndpointRegisterPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeInt(item.endpoints.size);
        for (const [key, value] of item.endpoints) {
            writer.writeString(key.key());
            writer.writeString(value?.key() ?? '');
        }
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointRegisterPacket {
        const reader = new ByteReader(item);
        const count = reader.readInt();
        const endpoints = new IdentifierMap<Identifier | undefined>();
        for (let i = 0; i < count; i++) {
            const key = Identifier.fromKey(reader.readString());
            const value = Identifier.fromKey(reader.readString());
            endpoints.set(key, value);
        }
        return new EndpointRegisterPacket(endpoints);
    }
}

export class EndpointDataPacket {
    constructor(
        public id: Identifier,
        public key: number,
        public data: Uint8Array,
    ) { }

    public static serialize(item: EndpointDataPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(item.id.key());
        writer.writeInt(item.key);
        writer.writeByteArray(item.data);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointDataPacket {
        const reader = new ByteReader(item);
        const id = Identifier.fromKey(reader.readString());
        const key = reader.readInt();
        const data = reader.readByteArray();
        return new EndpointDataPacket(id, key, data);
    }
}

export class EndpointErrorPacket {
    constructor(
        public id: Identifier,
        public key: number,
        public error: string,
    ) { }

    public static serialize(item: EndpointErrorPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(item.id.key());
        writer.writeInt(item.key);
        writer.writeString(item.error);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointErrorPacket {
        const reader = new ByteReader(item);
        const id = Identifier.fromKey(reader.readString());
        const key = reader.readInt();
        const error = reader.readString();
        return new EndpointErrorPacket(id, key, error);
    }
}

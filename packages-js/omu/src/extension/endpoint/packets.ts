import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Identifier, IdentifierMap } from '../../identifier.js';

export class EndpointRegisterPacket {
    constructor(
        public endpoints: IdentifierMap<Identifier | undefined>,
    ) { }

    public static serialize(item: EndpointRegisterPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(item.endpoints.size);
        for (const [key, value] of item.endpoints) {
            writer.writeString(key.key());
            writer.writeString(value?.key() ?? '');
        }
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointRegisterPacket {
        const reader = ByteReader.fromUint8Array(item);
        const count = reader.readULEB128();
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
        writer.writeULEB128(item.key);
        writer.writeUint8Array(item.data);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointDataPacket {
        const reader = ByteReader.fromUint8Array(item);
        const id = Identifier.fromKey(reader.readString());
        const key = reader.readULEB128();
        const data = reader.readUint8Array();
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
        writer.writeULEB128(item.key);
        writer.writeString(item.error);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointErrorPacket {
        const reader = ByteReader.fromUint8Array(item);
        const id = Identifier.fromKey(reader.readString());
        const key = reader.readULEB128();
        const error = reader.readString();
        return new EndpointErrorPacket(id, key, error);
    }
}

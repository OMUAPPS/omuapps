import { Identifier } from '../../identifier';
import { ByteReader, ByteWriter } from '../../serialize';

import { RegistryPermissions } from './registry.js';

export class RegistryPacket {
    constructor(
        public readonly id: Identifier,
        public readonly value: Uint8Array | null,
    ) { }

    public static serialize(packet: RegistryPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeBoolean(packet.value !== null);
        if (packet.value !== null) {
            writer.writeUint8Array(packet.value);
        }
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): RegistryPacket {
        const reader = ByteReader.fromUint8Array(data);
        const id = Identifier.fromKey(reader.readString());
        const existing = reader.readBoolean();
        const value = existing ? reader.readUint8Array() : null;
        return new RegistryPacket(id, value);
    }
}

export class RegistryRegisterPacket {
    constructor(
        public readonly id: Identifier,
        public readonly permissions: RegistryPermissions,
    ) { }

    public static serialize(packet: RegistryRegisterPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        packet.permissions.serialize(writer);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): RegistryRegisterPacket {
        const reader = ByteReader.fromUint8Array(data);
        const id = Identifier.fromKey(reader.readString());
        const permissions = RegistryPermissions.deserialize(reader);
        return new RegistryRegisterPacket(id, permissions);
    }
}

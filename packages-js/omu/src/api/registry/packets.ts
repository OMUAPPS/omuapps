import { Identifier } from '../../identifier';
import { ByteReader, ByteWriter } from '../../serialize';
import { RegistryPermissions, RegistryPermissionsJSON } from './registry';

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

export interface RegisterPacketJSON {
    id: string;
    permissions: RegistryPermissionsJSON;
}

export class RegisterPacket {
    constructor(
        public readonly id: Identifier,
        public readonly permissions: RegistryPermissions,
    ) {}

    public static serialize(packet: RegisterPacket): RegisterPacketJSON {
        const { permissions: perms } = packet;
        return {
            id: packet.id.key(),
            permissions: {
                all: perms.all ? Identifier.from(perms.all).key() : undefined,
                read: perms.read ? Identifier.from(perms.read).key() : undefined,
                write: perms.write ? Identifier.from(perms.write).key() : undefined,
            },
        };
    }

    public static deserialize(data: RegisterPacketJSON): RegisterPacket {
        const { permissions: perms } = data;
        return new RegisterPacket(
            Identifier.from(data.id),
            {
                all: perms.all ? Identifier.from(perms.all) : undefined,
                read: perms.read ? Identifier.from(perms.read) : undefined,
                write: perms.write ? Identifier.from(perms.write) : undefined,
            },
        );
    }
}

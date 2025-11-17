import { Identifier } from '../../identifier';
import { ByteReader, ByteWriter } from '../../serialize';

import { SignalPermissions, SignalPermissionsJSON } from './signal.js';

export class SignalPacket {
    constructor(
        public readonly id: Identifier,
        public readonly body: Uint8Array,
    ) { }

    public static serialize(packet: SignalPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeUint8Array(packet.body);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): SignalPacket {
        const reader = ByteReader.fromUint8Array(data);
        const id = Identifier.fromKey(reader.readString());
        const body = reader.readUint8Array();
        return new SignalPacket(id, body);
    }
}

interface SignalRegisterPacketJSON {
    id: string;
    permissions: SignalPermissionsJSON;
}

export class SignalRegisterPacket {
    constructor(
        public readonly id: Identifier,
        public readonly permissions: SignalPermissions,
    ) {}

    public static serialize(packet: SignalRegisterPacket): SignalRegisterPacketJSON {
        const { permissions: perms } = packet;
        return {
            id: packet.id.key(),
            permissions: {
                all: perms.all ? Identifier.from(perms.all).key() : undefined,
                listen: perms.listen ? Identifier.from(perms.listen).key() : undefined,
                send: perms.send ? Identifier.from(perms.send).key() : undefined,
            },
        };
    }

    public static deserialize(data: SignalRegisterPacketJSON): SignalRegisterPacket {
        const { permissions: perms } = data;
        return new SignalRegisterPacket(
            Identifier.fromKey(data.id),
            {
                all: perms.all ? Identifier.fromKey(perms.all) : undefined,
                listen: perms.listen ? Identifier.fromKey(perms.listen) : undefined,
                send: perms.send ? Identifier.fromKey(perms.send) : undefined,
            },
        );
    }
}

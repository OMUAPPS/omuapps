import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Identifier } from '../../identifier.js';

import { SignalPermissions } from './signal.js';

export class SignalPacket {
    constructor(
        public readonly id: Identifier,
        public readonly body: Uint8Array,
    ) { }

    public static serialize(packet: SignalPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        writer.writeByteArray(packet.body);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): SignalPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const body = reader.readByteArray();
        return new SignalPacket(id, body);
    }
}

export class SignalRegisterPacket {
    constructor(
        public readonly id: Identifier,
        public readonly permissions: SignalPermissions,
    ) { }

    public static serialize(packet: SignalRegisterPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.id.key());
        packet.permissions.serialize(writer);
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): SignalRegisterPacket {
        const reader = new ByteReader(data);
        const id = Identifier.fromKey(reader.readString());
        const permissions = SignalPermissions.deserialize(reader);
        return new SignalRegisterPacket(id, permissions);
    }
}

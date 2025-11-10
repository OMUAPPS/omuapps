import { Identifier } from '../../identifier';
import { ByteReader, ByteWriter } from '../../serialize';

import { SignalPermissions } from './signal.js';

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

export interface SignalRegisterPacket {
    id: Identifier;
    permissions: SignalPermissions;
}

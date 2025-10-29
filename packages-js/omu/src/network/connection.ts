import { Identifier, IdentifierMap } from '../identifier';
import type { Serializable } from '../serialize';

import type { Packet, PacketData, PacketType } from './packet';

export class PacketMapper implements Serializable<Packet, PacketData> {
    private readonly packetMap = new IdentifierMap<PacketType<unknown>>();

    public register(...packetTypes: PacketType<unknown>[]): void {
        for (const type of packetTypes) {
            if (this.packetMap.has(type.id)) {
                throw new Error(`Packet id ${type.id.key()} already registered`);
            }
            this.packetMap.set(type.id, type);
        }
    }

    serialize(packet: Packet): PacketData {
        return {
            type: packet.type.id.key(),
            data: packet.type.serializer.serialize(packet.data),
        };
    }

    deserialize(data: PacketData): Packet {
        const identifier = Identifier.fromKey(data.type);
        const type = this.packetMap.get(identifier);
        if (!type) throw new Error(`Packet type ${data.type} not registered`);
        return {
            type,
            data: type.serializer.deserialize(data.data),
        };
    }
}

export interface Transport {
    connect(): Promise<Connection>;
}

export interface Connection {
    send(packet: Packet, serializer: Serializable<Packet, PacketData>): void;
    receive(serializer: Serializable<Packet, PacketData>): Promise<Packet | null>;
    close(): void;
    closed: boolean;
}

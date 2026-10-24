import { InvalidPacket } from '@omujs/omu';
import type { PacketMapper } from '@omujs/omu/network';
import type { Packet } from '@omujs/omu/network/packet';
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';

import type { SocketChannel } from '../network';

export interface SessionConnection {
    readonly closed: boolean;
    send(packet: Packet, mapper: PacketMapper): Promise<void>;
    receive(mapper: PacketMapper): Promise<Packet | undefined>;
    close(): Promise<void>;
}

export class FramedConnection implements SessionConnection {
    public constructor(
        private readonly channel: SocketChannel,
    ) {}

    public get closed(): boolean {
        return this.channel.closed;
    }

    public async send(packet: Packet, mapper: PacketMapper): Promise<void> {
        if (this.closed) return;
        const data = mapper.serialize(packet);
        const writer = new ByteWriter();
        writer.writeString(data.type);
        writer.writeUint8Array(data.data);
        this.channel.send(writer.finish());
    }

    public async receive(mapper: PacketMapper): Promise<Packet | undefined> {
        const message = await this.channel.receive();
        if (message === undefined) return;
        if (typeof message === 'string') {
            throw new InvalidPacket(`Unknown message type text: ${message}`);
        }
        const reader = ByteReader.fromUint8Array(message);
        const type = reader.readString();
        const data = reader.readUint8Array();
        try {
            return mapper.deserialize({ type, data });
        } catch (error) {
            console.error(`Failed to deserialize packet ${type}`, error);
            throw new InvalidPacket(`Failed to deserialize packet: ${type}`);
        }
    }

    public async close(): Promise<void> {
        this.channel.close();
    }
}

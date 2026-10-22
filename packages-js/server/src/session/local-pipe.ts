import type { Connection, PacketMapper, Transport } from '@omujs/omu/network';
import type { Packet, PacketData } from '@omujs/omu/network/packet';
import type { Serializable } from '@omujs/omu/serialize';

import type { SessionConnection } from './session-connection.js';

class PacketQueue {
    private readonly items: PacketData[] = [];
    private waiter: (() => void) | undefined;
    public ended = false;

    public push(data: PacketData): void {
        if (this.ended) return;
        this.items.push(data);
        this.wake();
    }

    public end(): void {
        this.ended = true;
        this.wake();
    }

    public async pop(): Promise<PacketData | undefined> {
        while (this.items.length === 0) {
            if (this.ended) return;
            await new Promise<void>((resolve) => {
                this.waiter = resolve;
            });
        }
        return this.items.shift();
    }

    private wake(): void {
        const waiter = this.waiter;
        this.waiter = undefined;
        waiter?.();
    }
}

class LocalClientConnection implements Connection {
    public constructor(private readonly pipe: LocalPipe) {}

    public get closed(): boolean {
        return this.pipe.closed;
    }

    public send(packet: Packet, serializer: Serializable<Packet, PacketData>): void {
        this.pipe.toServer.push(serializer.serialize(packet));
    }

    public async receive(serializer: Serializable<Packet, PacketData>): Promise<Packet | null> {
        const data = await this.pipe.toClient.pop();
        if (!data) return null;
        return serializer.deserialize(data);
    }

    public close(): void {
        this.pipe.close();
    }
}

class LocalServerConnection implements SessionConnection {
    public constructor(private readonly pipe: LocalPipe) {}

    public get closed(): boolean {
        return this.pipe.closed;
    }

    public async send(packet: Packet, mapper: PacketMapper): Promise<void> {
        this.pipe.toClient.push(mapper.serialize(packet));
    }

    public async receive(mapper: PacketMapper): Promise<Packet | undefined> {
        const data = await this.pipe.toServer.pop();
        if (!data) return;
        return mapper.deserialize(data);
    }

    public async close(): Promise<void> {
        this.pipe.close();
    }
}

export class LocalPipe {
    public readonly toServer: PacketQueue = new PacketQueue();
    public readonly toClient: PacketQueue = new PacketQueue();
    public readonly client: Connection = new LocalClientConnection(this);
    public readonly server: SessionConnection = new LocalServerConnection(this);

    public get closed(): boolean {
        return this.toServer.ended && this.toClient.ended;
    }

    public close(): void {
        this.toServer.end();
        this.toClient.end();
    }
}

export interface LocalConnectionHost {
    attach(connection: SessionConnection): Promise<void>;
}

export class LocalTransport implements Transport {
    public constructor(private readonly host: LocalConnectionHost) {}

    public async connect(): Promise<Connection> {
        const pipe = new LocalPipe();
        this.host.attach(pipe.server).catch((error) => {
            console.error('Failed to attach local connection', error);
            pipe.close();
        });
        return pipe.client;
    }
}

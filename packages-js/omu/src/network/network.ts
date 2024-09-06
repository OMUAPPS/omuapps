import type { Address } from '../address.js';
import type { Client } from '../client.js';
import type { OmuError } from '../errors.js';
import {
    AnotherConnection,
    InvalidOrigin,
    InvalidPacket,
    InvalidToken,
    InvalidVersion,
    PermissionDenied,
} from '../errors.js';
import { EventEmitter } from '../event-emitter.js';
import { IdentifierMap } from '../identifier.js';
import type { TokenProvider } from '../token.js';
import { VERSION } from '../version.js';

import type { Connection } from './connection.js';
import { PacketMapper } from './connection.js';
import type { DisconnectPacket } from './packet/packet-types.js';
import { ConnectPacket, DisconnectType, PACKET_TYPES } from './packet/packet-types.js';
import type { Packet, PacketType } from './packet/packet.js';

type PacketHandler<T> = {
    readonly type: PacketType<T>;
    event: EventEmitter<[T]>;
};

export enum NetworkStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    READY = 'ready',
    ERROR = 'error',
    CLOSED = 'closed',
}

export class Network {
    public status: NetworkStatus = NetworkStatus.DISCONNECTED;
    public readonly event = {
        connected: new EventEmitter<[]>(),
        disconnected: new EventEmitter<[DisconnectPacket | null]>(),
        packet: new EventEmitter<[Packet]>(),
        status: new EventEmitter<[NetworkStatus]>(),
    };
    private readonly tasks: Array<() => Promise<void> | void> = [];
    private readonly packetMapper = new PacketMapper();
    private readonly packetHandlers = new IdentifierMap<PacketHandler<unknown>>();

    constructor(
        private readonly client: Client,
        public readonly address: Address,
        private readonly tokenProvider: TokenProvider,
        private connection: Connection,
    ) {
        this.registerPacket(
            PACKET_TYPES.CONNECT,
            PACKET_TYPES.DISCONNECT,
            PACKET_TYPES.TOKEN,
            PACKET_TYPES.READY,
        );
        this.addPacketHandler(PACKET_TYPES.TOKEN, async (token: string) => {
            await this.tokenProvider.set(this.address, this.client.app, token);
        });
        this.addPacketHandler(PACKET_TYPES.DISCONNECT, async (reason) => {
            await this.event.disconnected.emit(reason);
            if (reason.type === DisconnectType.SHUTDOWN || reason.type === DisconnectType.CLOSE) {
                return;
            }
            this.setStatus(NetworkStatus.ERROR);
            const ERROR_MAP: Record<DisconnectType, typeof OmuError | undefined> = {
                [DisconnectType.ANOTHER_CONNECTION]: AnotherConnection,
                [DisconnectType.PERMISSION_DENIED]: PermissionDenied,
                [DisconnectType.INVALID_TOKEN]: InvalidToken,
                [DisconnectType.INVALID_ORIGIN]: InvalidOrigin,
                [DisconnectType.INVALID_VERSION]: InvalidVersion,
                [DisconnectType.INVALID_PACKET]: InvalidPacket,
                [DisconnectType.INVALID_PACKET_TYPE]: InvalidPacket,
                [DisconnectType.INVALID_PACKET_DATA]: InvalidPacket,
                [DisconnectType.CLOSE]: undefined,
                [DisconnectType.SHUTDOWN]: undefined,
            };
            const error = ERROR_MAP[reason.type];
            if (error) {
                throw new error(reason.message);
            }
        });
        this.addPacketHandler(PACKET_TYPES.READY, () => {
            if (this.status === NetworkStatus.READY) {
                throw new Error('Received READY packet when already ready');
            }
            this.setStatus(NetworkStatus.READY);
            this.event.status.emit(NetworkStatus.READY);
            this.client.event.ready.emit();
        });
    }

    public setConnection(connection: Connection): void {
        if (this.status !== NetworkStatus.DISCONNECTED) {
            throw new Error('Cannot change connection while connected');
        }
        this.connection = connection;
    }

    public registerPacket(...packetTypes: PacketType<unknown>[]): void {
        this.packetMapper.register(...packetTypes);
        for (const type of packetTypes) {
            this.packetHandlers.set(type.id, {
                type,
                event: new EventEmitter(),
            });
        }
    }

    public addPacketHandler<T>(type: PacketType<T>, handler: (packet: T) => void): void {
        const listeners = this.packetHandlers.get(type.id) as PacketHandler<unknown> | undefined;
        if (!listeners) {
            throw new Error(`Packet type ${type.id.key()} not registered`);
        }
        listeners.event.listen(handler as (packet: unknown) => void);
    }

    public async connect(recconect = true): Promise<void> {
        if (this.status !== NetworkStatus.DISCONNECTED) {
            throw new Error(`Cannot connect while ${this.status}`);
        }

        try {
            await this.connection.connect();
        } catch (error) {
            if (recconect) {
                await this.tryReconnect();
            } else {
                throw error;
            }
        }
        this.setStatus(NetworkStatus.CONNECTING);
        const token = await this.tokenProvider.get(this.address, this.client.app);
        this.send({
            type: PACKET_TYPES.CONNECT,
            data: new ConnectPacket({
                app: this.client.app,
                protocol: {version: VERSION},
                token,
            }),
        });
        const listenPromise = this.listen();
        await this.event.status.emit(NetworkStatus.CONNECTED);
        await this.event.connected.emit();
        await this.dispatchTasks();
        this.send({
            type: PACKET_TYPES.READY,
            data: null,
        });
        await listenPromise;

        if (recconect) {
            await this.tryReconnect();
        }
    }

    private async tryReconnect(): Promise<void> {
        if (this.status === NetworkStatus.CLOSED) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.connect();
    }

    public disconnect(): void {
        if (this.status === NetworkStatus.CLOSED) {
            return;
        }
        this.setStatus(NetworkStatus.DISCONNECTED);
        this.event.status.emit(NetworkStatus.DISCONNECTED);
        this.connection.close();
        this.event.disconnected.emit(null);
    }

    public send(packet: Packet): void {
        if (this.connection.closed) {
            throw new Error('Cannot send packet while connection is closed');
        }
        this.connection.send(packet, this.packetMapper);
    }

    private async listen(): Promise<void> {
        while (!this.connection.closed) {
            const packet = await this.connection.receive(this.packetMapper);
            if (!packet) {
                return;
            }
            this.dispatchPacket(packet);
        }
    }

    private async dispatchPacket(packet: Packet): Promise<void> {
        await this.event.packet.emit(packet);
        const packetHandler = this.packetHandlers.get(packet.type.id);
        if (!packetHandler) {
            return;
        }
        await packetHandler.event.emit(packet.data);
    }

    public addTask(task: () => Promise<void> | void): void {
        if (this.client.running) {
            throw new Error('Cannot add task after client is ready');
        }
        this.tasks.push(task);
    }

    public removeTask(task: () => Promise<void> | void): void {
        this.tasks.splice(this.tasks.indexOf(task), 1);
    }

    private async dispatchTasks(): Promise<void> {
        for (const task of this.tasks) {
            await task();
        }
    }

    private setStatus(status: NetworkStatus): void {
        if (this.status === status) {
            throw new Error(`Cannot set status to ${status} when already ${status}`);
        }
        this.status = status;
        this.event.status.emit(status);
    }
}

import type { Address } from '../address.js';
import type { Client } from '../client.js';
import type { OmuError } from '../errors.js';
import {
    AnotherConnection,
    InternalError,
    InvalidOrigin,
    InvalidPacket,
    InvalidToken,
    InvalidVersion,
    PermissionDenied,
} from '../errors.js';
import { EventEmitter } from '../event';
import { IdentifierMap } from '../identifier';
import type { TokenProvider } from '../token.js';
import { VERSION } from '../version.js';

import type { Connection, Transport } from './connection.js';
import { PacketMapper } from './connection.js';
import type { DisconnectPacket } from './packet/packet-types.js';
import { ConnectPacket, DisconnectType, PACKET_TYPES } from './packet/packet-types.js';
import type { Packet, PacketType } from './packet/packet.js';

type PacketHandler<T> = {
    readonly type: PacketType<T>;
    event: EventEmitter<[T]>;
};

type StatusType<T> = {
    type: T,
};

export type NetworkStatus = StatusType<'connecting'> | StatusType<'connected'> | StatusType<'ready'> | {
    type: 'disconnected',
    attempt?: number,
    reason?: DisconnectPacket | null,
} | {
    type: 'error',
    error: OmuError,
} | {
    type: 'reconnecting',
    attempt: number,
    timeout: number,
    date: Date,
    cancel: () => void,
};

export class Network {
    public status: NetworkStatus = { type: 'disconnected' };
    public readonly event: { connected: EventEmitter<[]>; disconnected: EventEmitter<[DisconnectPacket | null]>; packet: EventEmitter<[Packet<unknown>]>; status: EventEmitter<[NetworkStatus]>; } = {
        connected: new EventEmitter<[]>(),
        disconnected: new EventEmitter<[DisconnectPacket | null]>(),
        packet: new EventEmitter<[Packet]>(),
        status: new EventEmitter<[NetworkStatus]>(),
    };
    private readonly tasks: Array<() => Promise<void> | void> = [];
    private readonly packetMapper = new PacketMapper();
    private readonly packetHandlers = new IdentifierMap<PacketHandler<unknown>>();
    private listenTask: Promise<void> | undefined = undefined;

    constructor(
        private readonly client: Client,
        public address: Address,
        private readonly tokenProvider: TokenProvider,
        private transport: Transport,
        private connection?: Connection | undefined,
    ) {
        this.registerPacket(
            PACKET_TYPES.SERVER_META,
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
            if (reason.type === DisconnectType.SHUTDOWN
                || reason.type === DisconnectType.CLOSE
                || reason.type === DisconnectType.SERVER_RESTART) {
                this.setStatus({ type: 'disconnected', reason });
                return;
            }
            const ERROR_MAP: Record<DisconnectType, typeof OmuError | undefined> = {
                [DisconnectType.ANOTHER_CONNECTION]: AnotherConnection,
                [DisconnectType.PERMISSION_DENIED]: PermissionDenied,
                [DisconnectType.INVALID_TOKEN]: InvalidToken,
                [DisconnectType.INVALID_ORIGIN]: InvalidOrigin,
                [DisconnectType.INVALID_VERSION]: InvalidVersion,
                [DisconnectType.INTERNAL_ERROR]: InternalError,
                [DisconnectType.INVALID_PACKET]: InvalidPacket,
                [DisconnectType.INVALID_PACKET_TYPE]: InvalidPacket,
                [DisconnectType.INVALID_PACKET_DATA]: InvalidPacket,
                [DisconnectType.SERVER_RESTART]: undefined,
                [DisconnectType.CLOSE]: undefined,
                [DisconnectType.SHUTDOWN]: undefined,
            };
            const error = ERROR_MAP[reason.type];
            if (error) {
                const omuError = new error(reason.message);
                await this.setStatus({ type: 'error', error: omuError });
            }
        });
        this.addPacketHandler(PACKET_TYPES.READY, () => {
            if (this.status.type === 'ready') {
                throw new Error('Received READY packet when already ready');
            }
            this.setStatus({ type: 'ready' });
        });
    }

    public setConnection(connection: Connection): void {
        if (this.status.type !== 'disconnected') {
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

    private async scheduleReconnect(attempt: number): Promise<boolean> {
        const timeout = Math.min(30000, 2000 * Math.pow(2, attempt));
        const date = new Date();
        let cancelled = false;
        await this.setStatus({
            type: 'reconnecting',
            attempt,
            timeout,
            date,
            cancel: () => {cancelled = true;},
        });
        if (cancelled) {
            return false;
        }
        const remaining = timeout - (new Date().getTime() - date.getTime());
        await new Promise((resolve) => setTimeout(resolve, remaining));
        return true;
    }

    public async connect(reconnect = true): Promise<void> {
        if (!this.isState('disconnected') && !this.isState('error')) {
            throw new Error(`Cannot connect while ${this.status.type}`);
        }
        if (this.listenTask) {
            throw new Error('Cannot connect while already connecting');
        }

        let attempt = 0;

        while (true) {
            attempt++;
            try {
                try {
                    this.connection = this.connection ?? await this.transport.connect();
                    attempt = 0;
                } catch (error) {
                    if (!reconnect) {
                        throw error;
                    }
                    if (!await this.scheduleReconnect(attempt)) {
                        return;
                    }
                    continue;
                }
                await this.setStatus({ type: 'connecting' });
                const metaReceived = await this.connection.receive(this.packetMapper);
                if (!metaReceived) {
                    throw new Error('Connection closed before receiving server meta');
                }
                if (!PACKET_TYPES.SERVER_META.is(metaReceived)) {
                    throw new Error('First packet received was not server meta');
                }
                this.address.hash = metaReceived.data.hash;
                const token = await this.tokenProvider.get(this.address, this.client.app);
                this.send({
                    type: PACKET_TYPES.CONNECT,
                    data: new ConnectPacket({
                        app: this.client.app,
                        protocol: { version: VERSION },
                        token,
                    }),
                });
                this.listenTask = this.listen();
                await this.setStatus({ type: 'connected' });
                await this.event.connected.emit();
                await this.dispatchTasks();
                this.send({
                    type: PACKET_TYPES.READY,
                    data: null,
                });
                await this.listenTask;
                if (this.status.type === 'error') {
                    throw this.status.error;
                }
            } finally {
                if (this.status.type !== 'disconnected' && this.status.type !== 'reconnecting' && this.status.type !== 'error') {
                    this.setStatus({ type: 'disconnected', attempt });
                }
                this.event.disconnected.emit(null);
                this.connection?.close();
                this.listenTask = undefined;
            }
            if (!reconnect) {
                break;
            }
            const shouldReconnect = await this.scheduleReconnect(attempt);
            if (!shouldReconnect) {
                break;
            }
        }
    }

    private isState(state: NetworkStatus['type']): boolean {
        return this.status.type === state;
    }

    public send(packet: Packet): void {
        if (!this.connection) {
            throw new Error('No connection established');
        }
        this.connection.send(packet, this.packetMapper);
    }

    private async listen(): Promise<void> {
        while (this.connection) {
            const packet = await this.connection.receive(this.packetMapper);
            if (!packet) {
                break;
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

    private async setStatus(status: NetworkStatus): Promise<void> {
        if (this.status === status) {
            throw new Error(`Cannot set status to ${status} when already ${status}`);
        }
        this.status = status;
        await this.event.status.emit(status);
    }
}

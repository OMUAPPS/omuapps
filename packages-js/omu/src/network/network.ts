import type { Address } from '../address.js';
import {
    AnotherConnection, DisconnectReason, InternalError,
    InvalidOrigin,
    InvalidPacket,
    InvalidToken,
    InvalidVersion, OmuError, PermissionDenied,
} from '../errors.js';
import { EventEmitter } from '../event';
import { IdentifierMap } from '../identifier';
import { Omu } from '../omu.js';
import type { TokenProvider } from '../token.js';
import { VERSION } from '../version.js';

import type { Connection, Transport } from './connection.js';
import { PacketMapper } from './connection.js';
import { AES, Decryptor, ENCRYPTION_AVAILABLE, EncryptionResponse, Encryptor } from './encryption.js';
import { ConnectPacket, DisconnectType, PACKET_TYPES } from './packet/packet-types.js';
import type { Packet, PacketType } from './packet/packet.js';

type PacketHandler<T> = {
    readonly type: PacketType<T>;
    event: EventEmitter<[T]>;
};

type StatusType<T> = {
    type: T;
};

export type NetworkStatus = StatusType<'connecting'> | StatusType<'connected'> | StatusType<'ready'> | {
    type: 'disconnected';
    attempt?: number;
    reason?: DisconnectReason;
} | {
    type: 'reconnecting';
    attempt: number;
    timeout: number;
    date: Date;
    cancel: () => void;
};

export class Network {
    public status: NetworkStatus = { type: 'disconnected' };
    public readonly event: { connected: EventEmitter<[]>; disconnected: EventEmitter<[DisconnectReason | undefined]>; packet: EventEmitter<[Packet<unknown>]>; status: EventEmitter<[NetworkStatus]> } = {
        connected: new EventEmitter(),
        disconnected: new EventEmitter(),
        packet: new EventEmitter(),
        status: new EventEmitter(),
    };
    private readonly tasks: Array<() => Promise<void> | void> = [];
    private readonly packetMapper = new PacketMapper();
    private readonly packetHandlers = new IdentifierMap<PacketHandler<unknown>>();
    private listenTask: Promise<void> | undefined = undefined;

    constructor(
        private readonly omu: Omu,
        public address: Address,
        private readonly tokenProvider: TokenProvider,
        private transport: Transport,
        private connection?: Connection | undefined,
        private aes?: AES | undefined,
    ) {
        this.registerPacket(
            PACKET_TYPES.SERVER_META,
            PACKET_TYPES.CONNECT,
            PACKET_TYPES.DISCONNECT,
            PACKET_TYPES.TOKEN,
            PACKET_TYPES.READY,
            PACKET_TYPES.ENCRYPTED_PACKET,
        );
        this.addPacketHandler(PACKET_TYPES.TOKEN, async (token: string) => {
            await this.tokenProvider.set(this.address, this.omu.app, token);
        });
        this.addPacketHandler(PACKET_TYPES.DISCONNECT, async (reason) => {
            if (reason.type === DisconnectType.SHUTDOWN
                || reason.type === DisconnectType.CLOSE
                || reason.type === DisconnectType.SERVER_RESTART) {
                this.setStatus({ type: 'disconnected' });
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
                throw new error(reason.message);
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
        if (!this.isState('disconnected')) {
            throw new Error(`Cannot connect while ${this.status.type}`);
        }
        if (this.listenTask) {
            throw new Error('Cannot connect while already connecting');
        }

        let attempt = 0;

        while (true) {
            attempt++;
            let reason: DisconnectReason | undefined = undefined;
            try {
                this.connection = await this.transport.connect();
                attempt = 0;
                await this.setStatus({ type: 'connecting' });
                const metaReceived = await this.connection.receive(this.packetMapper);
                if (!metaReceived) {
                    throw new Error('Connection closed before receiving server meta');
                }
                if (!PACKET_TYPES.SERVER_META.match(metaReceived)) {
                    throw new Error('First packet received was not server meta');
                }
                const { data: meta } = metaReceived;
                this.address.hash = meta.hash;
                let token = await this.tokenProvider.get(this.address, this.omu.app);
                if (!token) {
                    throw new InvalidToken(`No token available for app ${this.omu.app.id.key()} at ${this.address.host}:${this.address.port}:${this.address.hash}`);
                }
                let encryptionResp: EncryptionResponse | undefined = undefined;
                if (this.omu.app.type === 'remote' && ENCRYPTION_AVAILABLE && meta.encryption) {
                    const decryptor = await Decryptor.new();
                    const encryptor = await Encryptor.new(meta.encryption.rsa);
                    if (token) {
                        token = await encryptor.encryptString(token);
                    }
                    this.aes = await AES.new();
                    encryptionResp = {
                        kind: 'v1',
                        rsa: await decryptor.toRequest(),
                        aes: await this.aes.serialize(encryptor),
                    };
                }
                this.connection.send({
                    type: PACKET_TYPES.CONNECT,
                    data: new ConnectPacket({
                        app: this.omu.app,
                        protocol: { version: VERSION },
                        encryption: encryptionResp,
                        token,
                    }),
                }, this.packetMapper);
                this.listenTask = this.listen();
                await this.setStatus({ type: 'connected' });
                await this.event.connected.emit();
                await this.dispatchTasks();
                this.send({
                    type: PACKET_TYPES.READY,
                    data: null,
                });
                await this.listenTask;
            } catch (error) {
                if (error instanceof DisconnectReason) {
                    reason = error;
                }
                if (!reconnect) {
                    throw error;
                }
            } finally {
                this.event.disconnected.emit(reason);
                if (this.status.type !== 'disconnected' && this.status.type !== 'reconnecting') {
                    this.setStatus({ type: 'disconnected', attempt, reason });
                }
                this.connection?.close();
                this.connection = undefined;
                this.listenTask = undefined;
            }
            if (!reason?.type || ![
                DisconnectType.SHUTDOWN,
                DisconnectType.SERVER_RESTART,
                DisconnectType.INTERNAL_ERROR,
            ].includes(reason.type)) {
                break;
            }
            reason = undefined;
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

    public async send(packet: Packet): Promise<void> {
        if (!this.connection) {
            throw new Error('No connection established');
        }
        if (this.aes) {
            const serialized = this.packetMapper.serialize(packet);
            packet = await this.aes.encrypt(serialized);
        }
        this.connection.send(packet, this.packetMapper);
    }

    private async listen(): Promise<void> {
        while (this.connection) {
            const packet = await this.connection.receive(this.packetMapper);
            if (!packet) {
                break;
            }
            await this.dispatchPacket(packet);
        }
    }

    private async dispatchPacket(packet: Packet): Promise<void> {
        if (PACKET_TYPES.ENCRYPTED_PACKET.match(packet)) {
            if (!this.aes) {
                throw new Error('Received encrypted packet before encryption was established');
            }
            const decrypted = await this.aes.decrypt(packet);
            packet = this.packetMapper.deserialize(decrypted);
        }
        await this.event.packet.emit(packet);
        const packetHandler = this.packetHandlers.get(packet.type.id);
        if (!packetHandler) {
            return;
        }
        await packetHandler.event.emit(packet.data);
    }

    public addTask(task: () => Promise<void> | void): void {
        if (this.omu.running) {
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

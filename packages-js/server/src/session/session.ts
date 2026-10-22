import { type App, DisconnectReason, type Identifier } from '@omujs/omu';
import { EventEmitter } from '@omujs/omu/event';
import { type AES, DisconnectPacket, DisconnectType, PACKET_TYPES, type PacketMapper } from '@omujs/omu/network';
import type { Packet, PacketType } from '@omujs/omu/network/packet';

import { AppRole, type PermissionHandle } from '../security';

import type { PacketDispatcher } from './packet-dispatcher.js';
import type { SessionConnection } from './session-connection.js';

export class TaskPriority {
    public static readonly AFTER_CONNECTED = 0;
    public static readonly AFTER_PLUGIN = 200;
    public static readonly AFTER_SESSION = 300;
    public static readonly AFTER_PERMITTED = 400;
}

export type SessionTask = {
    name: string;
    detail: string;
    priority: number;
    run(): Promise<void>;
};

export class Session {
    public readonly role: AppRole;
    public readonly disconnected: EventEmitter<[Session]> = new EventEmitter();
    public readonly readied: EventEmitter<[Session]> = new EventEmitter();
    public ready = false;
    private readonly tasks: SessionTask[] = [];
    private readonly readyWaiters: Array<() => void> = [];
    private tasksStarted = false;
    private ended = false;

    public constructor(
        public readonly app: App,
        public readonly permissions: PermissionHandle,
        private readonly connection: SessionConnection,
        private readonly mapper: PacketMapper,
        private readonly aes: AES | undefined,
    ) {
        this.role = AppRole.of(app.type);
    }

    public get id(): Identifier {
        return this.app.id;
    }

    public get closed(): boolean {
        return this.ended || this.connection.closed;
    }

    public isAppId(id: Identifier): boolean {
        return this.app.id.namespace === id.namespace && this.app.id.path[0] === id.path[0];
    }

    public async send<T>(type: PacketType<T>, data: T): Promise<void> {
        if (this.closed) return;
        let packet: Packet = { type, data };
        if (this.aes) {
            packet = await this.aes.encrypt(this.mapper.serialize(packet));
        }
        await this.connection.send(packet, this.mapper);
    }

    public async disconnect(type: DisconnectType, message?: string): Promise<void> {
        if (this.ended) return;
        if (!this.connection.closed) {
            await this.send(PACKET_TYPES.DISCONNECT, new DisconnectPacket({ type, message }));
        }
        this.ended = true;
        await this.connection.close();
        for (const waiter of this.readyWaiters.splice(0)) {
            waiter();
        }
        await this.disconnected.emit(this);
    }

    public async listen(dispatcher: PacketDispatcher): Promise<void> {
        while (!this.ended) {
            let packet: Packet | undefined;
            try {
                packet = await this.receive();
            } catch (error) {
                const reason = error instanceof DisconnectReason ? error : undefined;
                await this.disconnect(reason?.type ?? DisconnectType.INVALID_PACKET, reason?.message ?? String(error));
                return;
            }
            if (!packet) break;
            void this.dispatch(dispatcher, packet);
        }
        await this.disconnect(DisconnectType.CLOSE, 'Connection closed');
    }

    public addTask(task: SessionTask): void {
        if (this.tasksStarted) throw new Error('Session is already ready');
        this.tasks.push(task);
    }

    public async waitReady(): Promise<void> {
        if (this.ready || this.ended) return;
        await new Promise<void>((resolve) => this.readyWaiters.push(resolve));
    }

    public async processReadyTasks(): Promise<boolean> {
        if (this.tasksStarted) throw new Error('Session is already ready');
        this.tasksStarted = true;
        this.tasks.sort((a, b) => a.priority - b.priority);
        for (const task of this.tasks) {
            try {
                await task.run();
            } catch (error) {
                if (error instanceof DisconnectReason) {
                    console.error(`Disconnecting ${this.app.id.key()} while processing ready task ${task.name}: ${task.detail}`, error);
                    await this.disconnect(error.type, error.message);
                    return false;
                }
                console.error(`Error while processing ready task ${task.name}: ${task.detail}`, error);
                await this.disconnect(DisconnectType.INTERNAL_ERROR, 'Error while processing ready tasks');
                return false;
            }
        }
        this.tasks.length = 0;
        this.ready = true;
        for (const waiter of this.readyWaiters.splice(0)) {
            waiter();
        }
        await this.readied.emit(this);
        return true;
    }

    private async receive(): Promise<Packet | undefined> {
        const packet = await this.connection.receive(this.mapper);
        if (!packet || !this.aes) return packet;
        if (!PACKET_TYPES.ENCRYPTED_PACKET.match(packet)) {
            throw new DisconnectReason(DisconnectType.INVALID_PACKET, `Expected encrypted packet but got ${packet.type.id.key()}`);
        }
        return this.mapper.deserialize(await this.aes.decrypt(packet));
    }

    private async dispatch(dispatcher: PacketDispatcher, packet: Packet): Promise<void> {
        try {
            await dispatcher.dispatch(this, packet);
        } catch (error) {
            if (error instanceof DisconnectReason) {
                console.error(`Disconnecting ${this.app.id.key()}`, error);
                await this.disconnect(error.type, error.message);
                return;
            }
            console.error(`Error handling packet ${packet.type.id.key()} from ${this.app.id.key()}`, error);
        }
    }
}

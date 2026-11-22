import { PacketMapper } from '@omujs/omu/network';
import type { Packet, PacketType } from '@omujs/omu/network/packet';

import type { Session } from './session.js';

export type PacketHandler<T> = (session: Session, data: T) => Promise<void> | void;

export class PacketDispatcher {
    public readonly mapper: PacketMapper = new PacketMapper();
    private readonly handlers = new Map<string, PacketHandler<unknown> | undefined>();

    public register(...types: PacketType<any>[]): void {
        this.mapper.register(...types);
        for (const type of types) {
            this.handlers.set(type.id.key(), undefined);
        }
    }

    public bind<T>(type: PacketType<T>, handler: PacketHandler<T>): void {
        const key = type.id.key();
        if (!this.handlers.has(key)) throw new Error(`Packet type ${key} not registered`);
        this.handlers.set(key, handler as PacketHandler<unknown>);
    }

    public async dispatch(session: Session, packet: Packet): Promise<void> {
        const key = packet.type.id.key();
        if (!this.handlers.has(key)) {
            console.warn(`Received unknown packet type ${key}`);
            return;
        }
        const handler = this.handlers.get(key);
        if (!handler) throw new Error(`No handler for packet type ${key}`);
        await handler(session, packet.data);
    }
}

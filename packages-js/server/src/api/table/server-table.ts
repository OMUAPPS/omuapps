import type { Identifier } from '@omujs/omu';
import {
    TABLE_ITEM_ADD_PACKET,
    TABLE_ITEM_CLEAR_PACKET,
    TABLE_ITEM_REMOVE_PACKET,
    TABLE_ITEM_UPDATE_PACKET,
    TABLE_PROXY_PACKET,
    TableItemsPacket,
    TablePacket,
    TableProxyPacket,
    type TableConfig,
    type TablePermissions,
} from '@omujs/omu/api/table';
import { EventEmitter, type Unlisten } from '@omujs/omu/event';

import type { Session } from '../../session';
import type { TableStore } from '../../storage';

export type TableItems = ReadonlyMap<string, Uint8Array>;

export class ServerTableEvents {
    public readonly add: EventEmitter<[TableItems]> = new EventEmitter();
    public readonly update: EventEmitter<[TableItems]> = new EventEmitter();
    public readonly remove: EventEmitter<[TableItems]> = new EventEmitter();
    public readonly clear: EventEmitter<[]> = new EventEmitter();
    public readonly cacheUpdate: EventEmitter<[TableItems]> = new EventEmitter();
}

export class TableSessionBinding {
    private readonly unlisten: Unlisten[];

    public constructor(
        private readonly table: ServerTable,
        private readonly session: Session,
    ) {
        this.unlisten = [
            table.events.add.listen((items) => this.send(TABLE_ITEM_ADD_PACKET, items)),
            table.events.update.listen((items) => this.send(TABLE_ITEM_UPDATE_PACKET, items)),
            table.events.remove.listen((items) => this.send(TABLE_ITEM_REMOVE_PACKET, items)),
            table.events.clear.listen(() => this.sendClear()),
        ];
    }

    public close(): void {
        for (const unlisten of this.unlisten) {
            unlisten();
        }
    }

    private async send(type: typeof TABLE_ITEM_ADD_PACKET, items: TableItems): Promise<void> {
        if (this.session.closed) return;
        await this.session.send(type, new TableItemsPacket(this.table.id, Object.fromEntries(items)));
    }

    private async sendClear(): Promise<void> {
        if (this.session.closed) return;
        await this.session.send(TABLE_ITEM_CLEAR_PACKET, new TablePacket(this.table.id));
    }
}

export class ServerTable {
    public readonly events: ServerTableEvents = new ServerTableEvents();
    public permissions: TablePermissions | undefined;
    private readonly bindings = new Map<Session, TableSessionBinding>();
    private readonly proxySessions = new Set<Session>();
    private readonly cache = new Map<string, Uint8Array>();
    private cacheSize = 0;
    private proxyKey = 0;

    public constructor(
        public readonly id: Identifier,
        private readonly store: TableStore,
    ) {}

    public setConfig(config: TableConfig): void {
        this.cacheSize = config.cache_size ?? 0;
    }

    public setCacheSize(size: number): void {
        this.cacheSize = size;
    }

    public attachSession(session: Session): void {
        if (this.bindings.has(session)) return;
        this.bindings.set(session, new TableSessionBinding(this, session));
        session.disconnected.listen(() => this.detachSession(session));
    }

    public attachProxySession(session: Session): void {
        this.proxySessions.add(session);
        session.disconnected.listen(() => this.detachSession(session));
    }

    public detachSession(session: Session): void {
        this.proxySessions.delete(session);
        this.bindings.get(session)?.close();
        this.bindings.delete(session);
    }

    public async get(key: string): Promise<Uint8Array | undefined> {
        const cached = this.cache.get(key);
        if (cached) return cached;
        const value = this.store.get(key);
        if (!value) return;
        await this.updateCache(new Map([[key, value]]));
        return value;
    }

    public async getMany(keys: readonly string[]): Promise<Map<string, Uint8Array>> {
        const items = new Map<string, Uint8Array>();
        const missing: string[] = [];
        for (const key of keys) {
            const cached = this.cache.get(key);
            if (cached) {
                items.set(key, cached);
                continue;
            }
            missing.push(key);
        }
        if (missing.length === 0) return items;
        for (const [key, value] of this.store.getMany(missing)) {
            items.set(key, value);
        }
        await this.updateCache(items);
        return items;
    }

    public async add(items: TableItems): Promise<void> {
        const [proxy] = this.proxySessions;
        if (proxy) {
            this.proxyKey += 1;
            await proxy.send(TABLE_PROXY_PACKET, new TableProxyPacket(this.id, Object.fromEntries(items), this.proxyKey));
            return;
        }
        await this.write(items, this.events.add);
    }

    public async proxy(session: Session, items: TableItems): Promise<void> {
        const sessions = [...this.proxySessions];
        const index = sessions.indexOf(session);
        if (index === -1) throw new Error('Session not in proxy sessions');
        const next = sessions[index + 1];
        if (!next) {
            await this.write(items, this.events.add);
            return;
        }
        await next.send(TABLE_PROXY_PACKET, new TableProxyPacket(this.id, Object.fromEntries(items), this.proxyKey));
    }

    public async update(items: TableItems): Promise<void> {
        await this.write(items, this.events.update);
    }

    public async remove(keys: readonly string[]): Promise<void> {
        const removed = this.store.getMany(keys);
        this.store.removeAll(keys);
        for (const key of keys) {
            this.cache.delete(key);
        }
        await this.events.remove.emit(removed);
    }

    public async clear(): Promise<void> {
        this.store.clear();
        this.cache.clear();
        await this.events.clear.emit();
    }

    public has(key: string): boolean {
        return this.store.has(key);
    }

    public hasMany(keys: readonly string[]): Record<string, boolean> {
        return this.store.hasMany(keys);
    }

    public hasAll(keys: readonly string[]): boolean {
        return this.store.hasAll(keys);
    }

    public hasAny(keys: readonly string[]): boolean {
        return this.store.hasAny(keys);
    }

    public fetchItems(limit: number, backward: boolean, cursor: string | null): Map<string, Uint8Array> {
        return this.store.fetchItems(limit, backward, cursor);
    }

    public fetchRange(start: string, end: string): Map<string, Uint8Array> {
        return this.store.fetchRange(start, end);
    }

    public fetchAll(): Map<string, Uint8Array> {
        return this.store.fetchAll();
    }

    public size(): number {
        return this.store.size();
    }

    public close(): void {
        this.store.close();
    }

    private async write(items: TableItems, event: EventEmitter<[TableItems]>): Promise<void> {
        this.store.setAll(items);
        await event.emit(items);
        await this.updateCache(items);
    }

    private async updateCache(items: TableItems): Promise<void> {
        if (this.cacheSize <= 0) return;
        for (const [key, value] of items) {
            this.cache.set(key, value);
            if (this.cache.size > this.cacheSize) {
                const [oldest] = this.cache.keys();
                this.cache.delete(oldest);
            }
        }
        await this.events.cacheUpdate.emit(this.cache);
    }
}

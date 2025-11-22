import type { Unlisten } from '../../event';
import { EventEmitter } from '../../event';
import { Identifier, IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet/packet.js';
import { Omu } from '../../omu';
import type { JsonType, Serializable } from '../../serialize';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import type { Extension } from '../extension.js';
import { ExtensionType } from '../extension.js';

import {
    SetConfigPacket,
    SetPermissionPacket,
    TableFetchPacket,
    TableFetchRangePacket,
    TableItemsPacket,
    TableKeysPacket,
    TablePacket,
    TableProxyPacket,
} from './packets.js';
import type { Table, TableConfig, TableEvents, TablePermissions } from './table.js';
import { TableType } from './table.js';

export const TABLE_EXTENSION_TYPE: ExtensionType<TableExtension> = new ExtensionType(
    'table',
    (client) => new TableExtension(client),
);
export const TABLE_PERMISSION_ID: Identifier = TABLE_EXTENSION_TYPE.join('permission');

const TABLE_SET_PERMISSION_PACKET = PacketType.createSerialized<SetPermissionPacket>(TABLE_EXTENSION_TYPE, {
    name: 'set_permission',
    serializer: SetPermissionPacket,
});
const TABLE_SET_CONFIG_PACKET = PacketType.createSerialized<SetConfigPacket>(TABLE_EXTENSION_TYPE, {
    name: 'set_config',
    serializer: SetConfigPacket,
});
const TABLE_LISTEN_PACKET = PacketType.createJson<Identifier>(TABLE_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Identifier,
});
const TABLE_PROXY_LISTEN_PACKET = PacketType.createJson<Identifier>(TABLE_EXTENSION_TYPE, {
    name: 'proxy_listen',
    serializer: Identifier,
});
const TABLE_PROXY_PACKET = PacketType.createSerialized<TableProxyPacket>(TABLE_EXTENSION_TYPE, {
    name: 'proxy',
    serializer: TableProxyPacket,
});
const TABLE_ITEM_ADD_PACKET = PacketType.createSerialized<TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'item_add',
    serializer: TableItemsPacket,
});
const TABLE_ITEM_UPDATE_PACKET = PacketType.createSerialized<TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'item_update',
    serializer: TableItemsPacket,
});
const TABLE_ITEM_REMOVE_PACKET = PacketType.createSerialized<TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'item_remove',
    serializer: TableItemsPacket,
});
const TABLE_ITEM_GET_ENDPOINT = EndpointType.createSerialized<TableKeysPacket, TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'item_get',
    requestSerializer: TableKeysPacket,
    responseSerializer: TableItemsPacket,
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_ITEM_HAS_ENDPOINT = EndpointType.createSerialized<TableKeysPacket, Record<string, boolean>>(TABLE_EXTENSION_TYPE, {
    name: 'item_has',
    requestSerializer: TableKeysPacket,
    responseSerializer: Serializer.json(),
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_ITEM_HAS_ALL_ENDPOINT = EndpointType.createSerialized<TableKeysPacket, boolean>(TABLE_EXTENSION_TYPE, {
    name: 'item_has_all',
    requestSerializer: TableKeysPacket,
    responseSerializer: Serializer.json(),
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_ITEM_HAS_ANY_ENDPOINT = EndpointType.createSerialized<TableKeysPacket, boolean>(TABLE_EXTENSION_TYPE, {
    name: 'item_has_any',
    requestSerializer: TableKeysPacket,
    responseSerializer: Serializer.json(),
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_FETCH_ENDPOINT = EndpointType.createSerialized<TableFetchPacket, TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'fetch',
    requestSerializer: TableFetchPacket,
    responseSerializer: TableItemsPacket,
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_FETCH_RANGE_ENDPOINT = EndpointType.createSerialized<TableFetchRangePacket, TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'fetch_range',
    requestSerializer: TableFetchRangePacket,
    responseSerializer: TableItemsPacket,
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_FETCH_ALL_ENDPOINT = EndpointType.createSerialized<TablePacket, TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'fetch_all',
    requestSerializer: TablePacket,
    responseSerializer: TableItemsPacket,
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_SIZE_ENDPOINT = EndpointType.createSerialized<TablePacket, number>(TABLE_EXTENSION_TYPE, {
    name: 'size',
    requestSerializer: TablePacket,
    responseSerializer: Serializer.json(),
    permissionId: TABLE_PERMISSION_ID,
});
const TABLE_ITEM_CLEAR_PACKET = PacketType.createSerialized<TablePacket>(TABLE_EXTENSION_TYPE, {
    name: 'clear',
    serializer: TablePacket,
});

export class TableExtension implements Extension {
    public readonly type: ExtensionType<TableExtension> = TABLE_EXTENSION_TYPE;
    private readonly tableMap = new IdentifierMap<Table<unknown>>();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            TABLE_SET_PERMISSION_PACKET,
            TABLE_SET_CONFIG_PACKET,
            TABLE_LISTEN_PACKET,
            TABLE_PROXY_LISTEN_PACKET,
            TABLE_PROXY_PACKET,
            TABLE_ITEM_ADD_PACKET,
            TABLE_ITEM_UPDATE_PACKET,
            TABLE_ITEM_REMOVE_PACKET,
            TABLE_ITEM_CLEAR_PACKET,
        );
    }

    private createTable<T>(tableType: TableType<T>): Table<T> {
        this.omu.permissions.require(TABLE_PERMISSION_ID);
        if (this.has(tableType.id)) {
            throw new Error('Table already exists');
        }
        const table = new TableImpl<T>(this.omu, tableType);
        this.tableMap.set(tableType.id, table as Table<unknown>);
        return table;
    }

    public json<T, D extends JsonType = JsonType>(name: string, options: { key: (item: T) => string; serializer?: Serializable<T, D> }): Table<T> {
        const tableType = new TableType<T>(
            this.omu.app.id.base.join(name),
            Serializer.pipe<T, JsonType, Uint8Array>(options.serializer ?? Serializer.noop(), Serializer.json()),
            options.key,
        );
        return this.createTable(tableType);
    }

    public serialized<T>(name: string, options: { key: (item: T) => string; serializer: Serializable<T, Uint8Array> }): Table<T> {
        const tableType = new TableType<T>(
            this.omu.app.id.base.join(name),
            options.serializer,
            options.key,
        );
        return this.createTable(tableType);
    }

    public get<T>(type: TableType<T>): Table<T> {
        if (this.has(type.id)) {
            return this.tableMap.get(type.id) as Table<T>;
        }
        return this.createTable(type);
    }

    public has(identifier: Identifier): boolean {
        return this.tableMap.has(identifier);
    }
}

class TableImpl<T> implements Table<T> {
    public cache: Map<string, T>;
    public readonly event: TableEvents<T>;
    private readonly promiseMap: Map<string, Promise<T | undefined>>;
    private readonly proxies: Array<(item: T) => T | undefined>;
    private id: Identifier;
    private serializer: Serializable<T, Uint8Array>;
    private keyFunction: (item: T) => string;
    private listening: boolean;
    private cacheSize?: number;
    private config?: TableConfig;
    private permissions?: TablePermissions;

    constructor(
        private readonly omu: Omu,
        tableType: TableType<T>,
    ) {
        this.id = tableType.id;
        this.serializer = tableType.serializer;
        this.keyFunction = tableType.keyFunction;
        this.cache = new Map();
        this.event = {
            add: new EventEmitter<[Map<string, T>]>(),
            update: new EventEmitter<[Map<string, T>]>(),
            remove: new EventEmitter<[Map<string, T>]>(),
            clear: new EventEmitter<[]>(),
            cacheUpdate: new EventEmitter<[Map<string, T>]>(),
        };
        this.promiseMap = new Map();
        this.proxies = [];
        this.listening = false;

        omu.network.addPacketHandler(TABLE_PROXY_PACKET, (packet) => {
            if (!packet.id.isEqual(this.id)) {
                return;
            }
            let items = this.deserializeItems(packet.items);
            this.proxies.forEach((proxy) => {
                items = new Map(
                    [...items.entries()]
                        .map(([key, item]) => {
                            const proxyItem = proxy(item);
                            if (proxyItem !== undefined) {
                                return [key, proxyItem as T];
                            }
                            return undefined;
                        })
                        .filter((item): item is [string, T] => {
                            return typeof item !== 'undefined';
                        }),
                );
            });
            omu.send(TABLE_PROXY_PACKET, {
                id: this.id,
                key: packet.key,
                items: Object.fromEntries(
                    [...items.entries()].map(([key, item]) => {
                        return [key, this.serializer.serialize(item)];
                    }),
                ),
            });
        });
        omu.network.addPacketHandler(TABLE_ITEM_ADD_PACKET, (packet) => {
            if (!packet.id.isEqual(this.id)) {
                return;
            }
            const items = this.deserializeItems(packet.items);
            this.updateCache(items);
            this.event.add.emit(items);
        });
        omu.network.addPacketHandler(TABLE_ITEM_UPDATE_PACKET, (packet) => {
            if (!packet.id.isEqual(this.id)) {
                return;
            }
            const items = this.deserializeItems(packet.items);
            this.updateCache(items);
            this.event.update.emit(items);
        });
        omu.network.addPacketHandler(TABLE_ITEM_REMOVE_PACKET, (packet) => {
            if (!packet.id.isEqual(this.id)) {
                return;
            }
            const items = this.deserializeItems(packet.items);
            items.forEach((_, key) => {
                this.cache.delete(key);
            });
            this.event.remove.emit(items);
            this.event.cacheUpdate.emit(this.cache);
        });
        omu.network.addPacketHandler(TABLE_ITEM_CLEAR_PACKET, (packet) => {
            if (!packet.id.isEqual(this.id)) {
                return;
            }
            this.cache = new Map();
            this.event.clear.emit();
            this.event.cacheUpdate.emit(this.cache);
        });
        omu.event.ready.listen(() => this.onReady());
    }

    private updateCache(items: Map<string, T>): void {
        if (!this.cacheSize) {
            this.cache = items;
        } else {
            const cache = new Map([...this.cache, ...items].slice(-this.cacheSize));
            this.cache = cache;
        }
        this.event.cacheUpdate.emit(this.cache);
    }

    public listen(listener?: (items: Map<string, T>) => void): Unlisten {
        if (!this.listening) {
            this.omu.onReady(() => {
                this.omu.send(TABLE_LISTEN_PACKET, this.id);
            });
            this.listening = true;
        }
        if (listener) {
            return this.event.cacheUpdate.listen(listener);
        }
        return () => {};
    }

    public proxy(callback: (item: T) => T | undefined): Unlisten {
        if (this.proxies.length === 0) {
            let cancel = (): void => {};
            cancel = this.omu.onReady(() => {
                if (this.proxies.length === 0) {
                    cancel();
                    return;
                }
                this.omu.send(TABLE_PROXY_LISTEN_PACKET, this.id);
            });
        }
        this.proxies.push(callback);
        return () => {
            this.proxies.splice(this.proxies.indexOf(callback), 1);
        };
    }

    private onReady(): void {
        if (this.config) {
            this.omu.send(TABLE_SET_CONFIG_PACKET, {
                id: this.id,
                config: this.config,
            });
        }
    }

    public async get(key: string): Promise<T | undefined> {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        if (this.promiseMap.has(key)) {
            return await this.promiseMap.get(key);
        }
        const promise = this.omu.endpoints
            .call(TABLE_ITEM_GET_ENDPOINT, {
                id: this.id,
                keys: [key],
            })
            .then((res) => {
                const items = this.deserializeItems(res.items);
                this.updateCache(items);
                return this.cache.get(key);
            });
        this.promiseMap.set(key, promise);
        return await promise.then((item) => {
            this.promiseMap.delete(key);
            return item;
        });
    }

    public async getMany(...keys: string[]): Promise<Map<string, T>> {
        const filteredKeys = keys
            .filter((key) => !this.cache.has(key))
            .filter((key) => !this.promiseMap.has(key));
        if (filteredKeys.length === 0) {
            return new Map([...this.cache].filter(([key]) => keys.includes(key)));
        }
        const promise = this.omu.endpoints
            .call(TABLE_ITEM_GET_ENDPOINT, {
                id: this.id,
                keys: filteredKeys,
            })
            .then((res) => {
                const items = this.deserializeItems(res.items);
                this.updateCache(items);
                return items;
            });
        for (const key of filteredKeys) {
            this.promiseMap.set(
                key,
                promise.then((items) => items.get(key)),
            );
        }
        const items = await promise;
        for (const key of filteredKeys) {
            this.promiseMap.delete(key);
        }
        return new Map([...this.cache, ...items].filter(([key]) => keys.includes(key)));
    }

    public async add(...items: T[]): Promise<void> {
        const data = this.serializeItems(items);
        this.omu.send(TABLE_ITEM_ADD_PACKET, {
            id: this.id,
            items: data,
        });
    }

    public async update(...items: T[]): Promise<void> {
        const data = this.serializeItems(items);
        this.omu.send(TABLE_ITEM_UPDATE_PACKET, {
            id: this.id,
            items: data,
        });
    }

    public async remove(...items: T[]): Promise<void> {
        const data = this.serializeItems(items);
        const keys = Object.keys(data);
        this.cache = new Map([...this.cache].filter(([key]) => !keys.includes(key)));
        this.omu.send(TABLE_ITEM_REMOVE_PACKET, {
            id: this.id,
            items: data,
        });
    }

    public async clear(): Promise<void> {
        this.omu.send(TABLE_ITEM_CLEAR_PACKET, {
            id: this.id,
        });
    }

    public async has(key: string): Promise<boolean> {
        if (this.cache.has(key)) {
            return true;
        }
        const res = await this.omu.endpoints.call(TABLE_ITEM_HAS_ENDPOINT, {
            id: this.id,
            keys: [key],
        });
        return res[key] ?? false;
    }

    public async hasMany<T extends Record<string, unknown>>(...keys: (keyof T)[]): Promise<{ [key in keyof T]: boolean }> {
        const res = await this.omu.endpoints.call(TABLE_ITEM_HAS_ENDPOINT, {
            id: this.id,
            keys: keys,
        });
        return res as { [key in keyof T]: boolean };
    }

    public async hasAll(...keys: string[]): Promise<boolean> {
        const res = await this.omu.endpoints.call(TABLE_ITEM_HAS_ALL_ENDPOINT, {
            id: this.id,
            keys,
        });
        return res;
    }

    public async hasAny(...keys: string[]): Promise<boolean> {
        const res = await this.omu.endpoints.call(TABLE_ITEM_HAS_ANY_ENDPOINT, {
            id: this.id,
            keys,
        });
        return res;
    }

    public async fetchItems({
        limit,
        backward,
        cursor,
    }: {
        limit: number;
        backward?: boolean;
        cursor?: string;
    }): Promise<Map<string, T>> {
        const res = await this.omu.endpoints.call(
            TABLE_FETCH_ENDPOINT,
            new TableFetchPacket(this.id, limit, backward, cursor),
        );
        const items = this.deserializeItems(res.items);
        this.updateCache(items);
        return items;
    }

    public async fetchRange({
        start,
        end,
    }: {
        start: string;
        end: string;
    }): Promise<Map<string, T>> {
        const res = await this.omu.endpoints.call(TABLE_FETCH_RANGE_ENDPOINT, {
            id: this.id,
            start,
            end,
        });
        const items = this.deserializeItems(res.items);
        this.updateCache(items);
        return items;
    }

    public async fetchAll(): Promise<Map<string, T>> {
        const res = await this.omu.endpoints.call(TABLE_FETCH_ALL_ENDPOINT, {
            id: this.id,
        });
        const items = this.deserializeItems(res.items);
        this.updateCache(items);
        return items;
    }

    public async *iterate({
        backward,
        cursor,
    }: {
        backward?: boolean;
        cursor?: string;
    }): AsyncIterable<T> {
        while (true) {
            const items = await this.fetchItems({
                limit: this.cacheSize ?? 100,
                backward,
                cursor,
            });
            if (items.size === 0) {
                break;
            }
            yield* items.values();
            if (cursor !== undefined) {
                items.delete(cursor);
            }
            const cursorItem = backward ? items.values().next().value : [...items.values()].pop();
            if (!cursorItem) {
                break;
            }
            cursor = this.keyFunction(cursorItem);
        }
    }

    public async size(): Promise<number> {
        return await this.omu.endpoints.call(TABLE_SIZE_ENDPOINT, {
            id: this.id,
        });
    }

    private deserializeItems(items: Record<string, Uint8Array>): Map<string, T> {
        return new Map(
            Object.entries(items).map(([key, data]) => {
                const item = this.serializer.deserialize(data);
                this.cache.set(key, item);
                return [key, item];
            }),
        );
    }

    private serializeItems(items: T[]): Record<string, Uint8Array> {
        return Object.fromEntries(
            items.map((item) => {
                return [this.keyFunction(item), this.serializer.serialize(item)];
            }),
        );
    }

    public setCacheSize(size: number): void {
        this.cacheSize = size;
    }

    public setConfig(config: TableConfig): void {
        if (this.omu.running) {
            throw new Error('Cannot set config after client has started');
        }
        this.config = config;
    }

    public setPermissions(permissions: TablePermissions): void {
        this.permissions = permissions;
    }
}

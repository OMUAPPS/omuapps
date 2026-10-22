import { type Identifier, PermissionDenied } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';
import {
    type SetConfigPacket,
    type SetPermissionPacket,
    TABLE_FETCH_ALL_ENDPOINT,
    TABLE_FETCH_ENDPOINT,
    TABLE_FETCH_RANGE_ENDPOINT,
    TABLE_ITEM_ADD_PACKET,
    TABLE_ITEM_CLEAR_PACKET,
    TABLE_ITEM_GET_ENDPOINT,
    TABLE_ITEM_HAS_ALL_ENDPOINT,
    TABLE_ITEM_HAS_ANY_ENDPOINT,
    TABLE_ITEM_HAS_ENDPOINT,
    TABLE_ITEM_REMOVE_PACKET,
    TABLE_ITEM_UPDATE_PACKET,
    TABLE_LISTEN_PACKET,
    TABLE_PERMISSION_ID,
    TABLE_PROXY_LISTEN_PACKET,
    TABLE_PROXY_PACKET,
    TABLE_SET_CONFIG_PACKET,
    TABLE_SET_PERMISSION_PACKET,
    TABLE_SIZE_ENDPOINT,
    type TableFetchPacket,
    type TableFetchRangePacket,
    TableItemsPacket,
    type TableKeysPacket,
    type TablePermissions,
    type TableType,
} from '@omujs/omu/api/table';

import type { PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';
import { type StorageRoot, TableStore } from '../../storage';
import type { EndpointExtension } from '../endpoint';

import { ServerTable } from './server-table.js';
import { TypedTable } from './typed-table.js';

type Scope = (permissions: TablePermissions) => (Identifier | undefined)[];

export class TableExtension {
    private static readonly PERMISSION = new PermissionType({
        id: TABLE_PERMISSION_ID,
        metadata: {
            level: 'low',
            name: { ja: 'テーブル', en: 'Table Permission' },
            note: { ja: 'テーブル形式のデータを扱うために使われます', en: 'Used to handle table formatted data' },
        },
    });

    private readonly tables = new Map<string, ServerTable>();

    public constructor(
        dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        security: PermissionManager,
        private readonly storage: StorageRoot,
    ) {
        security.registerPermission(TableExtension.PERMISSION);
        dispatcher.register(
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
        const read: Scope = (p) => [p.all, p.read];
        const write: Scope = (p) => [p.all, p.write];
        const remove: Scope = (p) => [p.all, p.remove];
        const proxy: Scope = (p) => [p.all, p.proxy];
        dispatcher.bind(TABLE_SET_PERMISSION_PACKET, (session, packet) => this.handleSetPermission(session, packet));
        dispatcher.bind(TABLE_SET_CONFIG_PACKET, (session, packet) => this.handleSetConfig(session, packet));
        dispatcher.bind(TABLE_LISTEN_PACKET, (session, id) => this.verified(session, id, read).attachSession(session));
        dispatcher.bind(TABLE_PROXY_LISTEN_PACKET, (session, id) => this.verified(session, id, proxy).attachProxySession(session));
        dispatcher.bind(TABLE_PROXY_PACKET, (session, packet) => this.verified(session, packet.id, proxy).proxy(session, TableExtension.items(packet.items)));
        dispatcher.bind(TABLE_ITEM_ADD_PACKET, (session, packet) => this.verified(session, packet.id, write).add(TableExtension.items(packet.items)));
        dispatcher.bind(TABLE_ITEM_UPDATE_PACKET, (session, packet) => this.verified(session, packet.id, write).update(TableExtension.items(packet.items)));
        dispatcher.bind(TABLE_ITEM_REMOVE_PACKET, (session, packet) => this.verified(session, packet.id, remove).remove(Object.keys(packet.items)));
        dispatcher.bind(TABLE_ITEM_CLEAR_PACKET, (session, packet) => this.verified(session, packet.id, remove).clear());
        endpoints.bind(TABLE_ITEM_GET_ENDPOINT, async (session, packet: TableKeysPacket) => {
            const items = await this.verified(session, packet.id, read).getMany(packet.keys);
            return new TableItemsPacket(packet.id, Object.fromEntries(items));
        });
        endpoints.bind(TABLE_ITEM_HAS_ENDPOINT, (session, packet) => this.verified(session, packet.id, read).hasMany(packet.keys));
        endpoints.bind(TABLE_ITEM_HAS_ALL_ENDPOINT, (session, packet) => this.verified(session, packet.id, read).hasAll(packet.keys));
        endpoints.bind(TABLE_ITEM_HAS_ANY_ENDPOINT, (session, packet) => this.verified(session, packet.id, read).hasAny(packet.keys));
        endpoints.bind(TABLE_FETCH_ENDPOINT, (session, packet: TableFetchPacket) => {
            const items = this.verified(session, packet.id, read).fetchItems(packet.limit, packet.backward, packet.cursor);
            return new TableItemsPacket(packet.id, Object.fromEntries(items));
        });
        endpoints.bind(TABLE_FETCH_RANGE_ENDPOINT, (session, packet: TableFetchRangePacket) => {
            const items = this.verified(session, packet.id, read).fetchRange(packet.start, packet.end);
            return new TableItemsPacket(packet.id, Object.fromEntries(items));
        });
        endpoints.bind(TABLE_FETCH_ALL_ENDPOINT, (session, packet) => {
            const items = this.verified(session, packet.id, read).fetchAll();
            return new TableItemsPacket(packet.id, Object.fromEntries(items));
        });
        endpoints.bind(TABLE_SIZE_ENDPOINT, (_, packet) => this.table(packet.id).size());
    }

    public register<T>(type: TableType<T>): TypedTable<T> {
        const table = this.table(type.id);
        table.permissions = type.permissions;
        return new TypedTable(table, type);
    }

    public table(id: Identifier): ServerTable {
        const existing = this.tables.get(id.key());
        if (existing) return existing;
        const table = new ServerTable(id, new TableStore(this.storage.file('tables', id)));
        this.tables.set(id.key(), table);
        return table;
    }

    public close(): void {
        for (const table of this.tables.values()) {
            table.close();
        }
        this.tables.clear();
    }

    private handleSetPermission(session: Session, packet: SetPermissionPacket): void {
        this.verified(session, packet.id, (p) => [p.all]).permissions = {
            all: packet.all ?? undefined,
            read: packet.read ?? undefined,
            write: packet.write ?? undefined,
            remove: packet.remove ?? undefined,
            proxy: packet.proxy ?? undefined,
        };
    }

    private handleSetConfig(session: Session, packet: SetConfigPacket): void {
        this.verified(session, packet.id, (p) => [p.all]).setConfig(packet.config);
    }

    private verified(session: Session, id: Identifier, scope: Scope): ServerTable {
        const table = this.table(id);
        if (session.isAppId(table.id)) return table;
        if (!table.permissions) throw new PermissionDenied(`Table ${table.id.key()} does not have a permission set`);
        for (const permission of scope(table.permissions)) {
            if (permission && session.permissions.has(permission)) return table;
        }
        throw new PermissionDenied(`Table ${table.id.key()} does not have permission`);
    }

    private static items(items: Record<string, Uint8Array>): Map<string, Uint8Array> {
        return new Map(Object.entries(items));
    }
}

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from omu.api.permission import PermissionType
from omu.api.table import Table, TablePermissions, TableType
from omu.api.table.extension import (
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
)
from omu.api.table.packets import (
    SetConfigPacket,
    SetPermissionPacket,
    TableFetchPacket,
    TableFetchRangePacket,
    TableItemsPacket,
    TableKeysPacket,
    TablePacket,
    TableProxyPacket,
)
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from omu.interface import Keyable

from omuserver.session import Session

from .adapters.sqlitetable import SqliteTableAdapter
from .adapters.tableadapter import TableAdapter
from .cached_table import CachedTable
from .serialized_table import SerializedTable
from .server_table import ServerTable

if TYPE_CHECKING:
    from omuserver.server import Server

TABLE_PERMISSION = PermissionType(
    TABLE_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "テーブル",
            "en": "Table Permission",
        },
        "note": {
            "ja": "テーブル形式のデータを扱うために使われます",
            "en": "Used to handle table formatted data",
        },
    },
)


class TableExtension:
    def __init__(self, server: Server) -> None:
        self.server = server
        self._tables: dict[Identifier, ServerTable] = {}
        self._adapters: list[TableAdapter] = []
        server.security.register_permission(TABLE_PERMISSION)
        server.packets.register(
            TABLE_SET_PERMISSION_PACKET,
            TABLE_SET_CONFIG_PACKET,
            TABLE_LISTEN_PACKET,
            TABLE_PROXY_LISTEN_PACKET,
            TABLE_PROXY_PACKET,
            TABLE_ITEM_ADD_PACKET,
            TABLE_ITEM_UPDATE_PACKET,
            TABLE_ITEM_REMOVE_PACKET,
            TABLE_ITEM_CLEAR_PACKET,
        )
        server.packets.bind(TABLE_SET_PERMISSION_PACKET, self.handle_bind_permission)
        server.packets.bind(TABLE_SET_CONFIG_PACKET, self.handle_table_config)
        server.packets.bind(TABLE_LISTEN_PACKET, self.handler_listen)
        server.packets.bind(TABLE_PROXY_LISTEN_PACKET, self.handle_proxy_listen)
        server.packets.bind(TABLE_PROXY_PACKET, self.handle_proxy)
        server.packets.bind(TABLE_ITEM_ADD_PACKET, self.handle_item_add)
        server.packets.bind(TABLE_ITEM_UPDATE_PACKET, self.handle_item_update)
        server.packets.bind(TABLE_ITEM_REMOVE_PACKET, self.handle_item_remove)
        server.packets.bind(TABLE_ITEM_CLEAR_PACKET, self.handle_item_clear)
        server.endpoints.bind(TABLE_ITEM_GET_ENDPOINT, self.handle_item_get)
        server.endpoints.bind(TABLE_ITEM_HAS_ENDPOINT, self.handle_item_has)
        server.endpoints.bind(TABLE_ITEM_HAS_ALL_ENDPOINT, self.handle_item_has_all)
        server.endpoints.bind(TABLE_ITEM_HAS_ANY_ENDPOINT, self.handle_item_has_any)
        server.endpoints.bind(TABLE_FETCH_ENDPOINT, self.handle_item_fetch)
        server.endpoints.bind(TABLE_FETCH_RANGE_ENDPOINT, self.handle_item_fetch_range)
        server.endpoints.bind(TABLE_FETCH_ALL_ENDPOINT, self.handle_item_fetch_all)
        server.endpoints.bind(TABLE_SIZE_ENDPOINT, self.handle_table_size)
        server.event.start += self.on_server_start
        server.event.stop += self.on_server_stop

    async def handle_bind_permission(self, session: Session, packet: SetPermissionPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all])
        permissions = TablePermissions(
            all=packet.all,
            read=packet.read,
            write=packet.write,
            remove=packet.remove,
            proxy=packet.proxy,
        )
        table.set_permissions(permissions)

    async def handle_item_get(self, session: Session, packet: TableKeysPacket) -> TableItemsPacket:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        items = await table.get_many(*packet.keys)
        return TableItemsPacket(
            id=packet.id,
            items=items,
        )

    async def handle_item_has(self, session: Session, packet: TableKeysPacket) -> dict[str, bool]:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        return await table.has_many(packet.keys)

    async def handle_item_has_all(self, session: Session, packet: TableKeysPacket) -> bool:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        return await table.has_all(packet.keys)

    async def handle_item_has_any(self, session: Session, packet: TableKeysPacket) -> bool:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        return await table.has_any(packet.keys)

    async def handle_item_fetch(self, session: Session, packet: TableFetchPacket) -> TableItemsPacket:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        items = await table.fetch_items(
            limit=packet.limit,
            backward=packet.backward,
            cursor=packet.cursor,
        )
        return TableItemsPacket(
            id=packet.id,
            items=items,
        )

    async def handle_item_fetch_range(self, session: Session, packet: TableFetchRangePacket) -> TableItemsPacket:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        items = await table.fetch_range(packet.start, packet.end)
        return TableItemsPacket(
            id=packet.id,
            items=items,
        )

    async def handle_item_fetch_all(self, session: Session, packet: TablePacket) -> TableItemsPacket:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.read])
        items = await table.fetch_all()
        return TableItemsPacket(
            id=packet.id,
            items=items,
        )

    async def handle_table_size(self, session: Session, packet: TablePacket) -> int:
        table = await self.get_table(packet.id)
        return await table.size()

    async def handle_table_config(self, session: Session, packet: SetConfigPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all])
        table.set_config(packet.config)

    async def handler_listen(self, session: Session, id: Identifier) -> None:
        table = await self.get_with_perm(session, id, lambda perms: [perms.all, perms.read])
        table.attach_session(session)

    async def handle_proxy_listen(self, session: Session, id: Identifier) -> None:
        table = await self.get_with_perm(session, id, lambda perms: [perms.all, perms.proxy])
        table.attach_proxy_session(session)

    async def handle_proxy(self, session: Session, packet: TableProxyPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.proxy])
        await table.proxy(session, packet.key, packet.items)

    async def handle_item_add(self, session: Session, packet: TableItemsPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.write])
        await table.add(packet.items)

    async def handle_item_update(self, session: Session, packet: TableItemsPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.write])
        await table.update(packet.items)

    async def handle_item_remove(self, session: Session, packet: TableItemsPacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.remove])
        await table.remove(list(packet.items.keys()))

    async def handle_item_clear(self, session: Session, packet: TablePacket) -> None:
        table = await self.get_with_perm(session, packet.id, lambda perms: [perms.all, perms.remove])
        await table.clear()

    async def register_table[T: Keyable](self, table_type: TableType[T]) -> Table[T]:
        table = await self.get_table(table_type.id)
        return SerializedTable(table, table_type)

    async def get_table(self, id: Identifier) -> ServerTable:
        if id in self._tables:
            return self._tables[id]
        table = CachedTable(self.server, id)
        adapter = SqliteTableAdapter.create(self.get_table_path(id))
        await adapter.load()
        table.set_adapter(adapter)
        self._tables[id] = table
        return table

    async def get_with_perm(
        self, session: Session, id: Identifier, get_scopes: Callable[[TablePermissions], list[Identifier | None]]
    ) -> ServerTable:
        table = await self.get_table(id)
        await self.verify_permission(session, table, get_scopes)
        return table

    async def verify_permission(
        self,
        session: Session,
        table: ServerTable,
        get_scopes: Callable[[TablePermissions], list[Identifier | None]],
    ):
        if session.is_app_id(table.id):
            return
        if table.permissions is None:
            raise PermissionDenied(f"Table {table.id} does not have a permission set")
        permissions: list[Identifier | None] = get_scopes(table.permissions)
        for permission in permissions:
            if permission is None:
                continue
            if session.permissions.has(permission):
                return

        raise PermissionDenied(f"Table {table.id} does not have permission {table.permissions}")

    def get_table_path(self, id: Identifier) -> Path:
        path = self.server.directories.get("tables") / id.get_sanitized_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    async def on_server_start(self) -> None:
        for table in self._tables.values():
            await table.load()

    async def on_server_stop(self) -> None:
        for table in self._tables.values():
            await table.store()

    def register[T](self, table_type: TableType[T]) -> Table[T]:
        table = CachedTable(self.server, table_type.id)
        table.set_permissions(table_type.permissions)
        adapter = SqliteTableAdapter.create(self.get_table_path(table_type.id))
        table.set_adapter(adapter)
        self._tables[table_type.id] = table
        return SerializedTable(table, table_type)

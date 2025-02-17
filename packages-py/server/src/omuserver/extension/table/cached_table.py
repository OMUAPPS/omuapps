from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Mapping

from omu.extension.table import TableConfig, TablePermissions
from omu.extension.table.table_extension import TABLE_PROXY_PACKET, TableProxyPacket
from omu.identifier import Identifier

from omuserver.server import Server
from omuserver.session import Session

from .adapters.tableadapter import TableAdapter
from .server_table import ServerTable, ServerTableEvents
from .session_table_handler import SessionTableListener


class CachedTable(ServerTable):
    def __init__(
        self,
        server: Server,
        id: Identifier,
    ):
        self._server = server
        self._id = id
        self._event = ServerTableEvents()
        self._sessions: dict[Session, SessionTableListener] = {}
        self._permissions: TablePermissions | None = None
        self._proxy_sessions: dict[str, Session] = {}
        self._changed = False
        self._proxy_id = 0
        self._save_task: asyncio.Task | None = None
        self._adapter: TableAdapter | None = None
        self.config: TableConfig = {}
        self._cache: dict[str, bytes] = {}
        self._cache_size: int | None = None

    def set_config(self, config: TableConfig) -> None:
        self.config = config
        self._cache_size = config.get("cache_size", None)

    @property
    def permissions(self) -> TablePermissions | None:
        return self._permissions

    def set_permissions(self, permissions: TablePermissions | None) -> None:
        self._permissions = permissions

    def set_adapter(self, adapter: TableAdapter) -> None:
        self._adapter = adapter

    async def load(self) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        await self._adapter.load()

    async def store(self) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        if not self._changed:
            return
        await self._adapter.store()
        self._changed = False

    def attach_session(self, session: Session) -> None:
        if session in self._sessions:
            return
        handler = SessionTableListener(
            id=self._id,
            session=session,
            table=self,
        )
        self._sessions[session] = handler
        session.event.disconnected += self.handle_disconnection

    def detach_session(self, session: Session) -> None:
        if session in self._proxy_sessions:
            del self._proxy_sessions[session.app.key()]
        if session in self._sessions:
            handler = self._sessions.pop(session)
            handler.close()

    async def handle_disconnection(self, session: Session) -> None:
        self.detach_session(session)

    def attach_proxy_session(self, session: Session) -> None:
        self._proxy_sessions[session.app.key()] = session

    async def get(self, key: str) -> bytes | None:
        if self._adapter is None:
            raise Exception("Table not set")
        if key in self._cache:
            return self._cache[key]
        data = await self._adapter.get(key)
        if data is None:
            return None
        await self.update_cache({key: data})
        return data

    async def get_many(self, *keys: str) -> dict[str, bytes]:
        key_list = list(keys)
        if self._adapter is None:
            raise Exception("Table not set")
        items: dict[str, bytes] = {}
        for key in tuple(key_list):
            if key in self._cache:
                items[key] = self._cache[key]
                key_list.remove(key)
        if len(key_list) == 0:
            return items
        data = await self._adapter.get_many(key_list)
        for key, value in data.items():
            items[key] = value
        await self.update_cache(items)
        return items

    async def add(self, items: Mapping[str, bytes]) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        if len(self._proxy_sessions) > 0:
            await self.send_proxy_event(items)
            return
        await self._adapter.set_all(items)
        await self._event.add(items)
        await self.update_cache(items)
        self.mark_changed()

    async def send_proxy_event(self, items: Mapping[str, bytes]) -> None:
        session = tuple(self._proxy_sessions.values())[0]
        self._proxy_id += 1
        await session.send(
            TABLE_PROXY_PACKET,
            TableProxyPacket(
                id=self._id,
                items=items,
                key=self._proxy_id,
            ),
        )

    async def proxy(
        self, session: Session, key: int, items: Mapping[str, bytes]
    ) -> int:
        adapter = self._adapter
        if adapter is None:
            raise Exception("Table not set")
        if session.app.key() not in self._proxy_sessions:
            raise ValueError("Session not in proxy sessions")
        session_key = session.app.key()
        index = tuple(self._proxy_sessions.keys()).index(session_key)
        if index == len(self._proxy_sessions) - 1:
            adapter = self._adapter
            if adapter is None:
                raise Exception("Table not set")
            await adapter.set_all(items)
            await self._event.add(items)
            await self.update_cache(items)
            self.mark_changed()
            return 0
        session = tuple(self._proxy_sessions.values())[index + 1]
        await session.send(
            TABLE_PROXY_PACKET,
            TableProxyPacket(
                id=self._id,
                items=items,
                key=self._proxy_id,
            ),
        )
        return self._proxy_id

    async def update(self, items: Mapping[str, bytes]) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        await self._adapter.set_all(items)
        await self._event.update(items)
        await self.update_cache(items)
        self.mark_changed()

    async def remove(self, keys: list[str] | tuple[str, ...]) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        removed = await self._adapter.get_many(keys)
        await self._adapter.remove_all(keys)
        for key in keys:
            if key in self._cache:
                del self._cache[key]
        await self._event.remove(removed)
        self.mark_changed()

    async def clear(self) -> None:
        if self._adapter is None:
            raise Exception("Table not set")
        await self._adapter.clear()
        await self._event.clear()
        self._cache.clear()
        self.mark_changed()

    async def has(self, key: str) -> bool:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.has(key)

    async def has_many(self, keys: list[str] | tuple[str, ...]) -> dict[str, bool]:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.has_many(list(keys))

    async def has_all(self, keys: list[str] | tuple[str, ...]) -> bool:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.has_all(list(keys))

    async def has_any(self, keys: list[str] | tuple[str, ...]) -> bool:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.has_any(list(keys))

    async def fetch_items(
        self,
        limit: int,
        backward: bool = False,
        cursor: str | None = None,
    ) -> dict[str, bytes]:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.fetch_items(limit, backward, cursor)

    async def fetch_range(self, start: str, end: str) -> dict[str, bytes]:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.fetch_range(start, end)

    async def fetch_all(self) -> dict[str, bytes]:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.fetch_all()

    async def iterate(self) -> AsyncGenerator[bytes, None]:
        cursor: str | None = None
        while True:
            items = await self.fetch_items(
                limit=self.config.get("chunk_size", 100),
                cursor=cursor,
            )
            if len(items) == 0:
                break
            for item in items.values():
                yield item
            *_, cursor = items.keys()

    async def size(self) -> int:
        if self._adapter is None:
            raise Exception("Table not set")
        return await self._adapter.size()

    async def save_task(self) -> None:
        while self._changed:
            await self.store()
            await asyncio.sleep(30)

    def mark_changed(self) -> None:
        self._changed = True
        if self._save_task is None:
            self._save_task = asyncio.create_task(self.save_task())

    def set_cache_size(self, size: int) -> None:
        self._cache_size = size

    async def update_cache(self, items: Mapping[str, bytes]) -> None:
        if self._cache_size is None or self._cache_size <= 0:
            return
        for key, item in items.items():
            self._cache[key] = item
            if len(self._cache) > self._cache_size:
                del self._cache[next(iter(self._cache))]
        await self._event.cache_update(self._cache)

    @property
    def cache(self) -> Mapping[str, bytes]:
        return self._cache

    @property
    def event(self) -> ServerTableEvents:
        return self._event

    @property
    def id(self) -> Identifier:
        return self._id

    @property
    def adapter(self) -> TableAdapter | None:
        return self._adapter

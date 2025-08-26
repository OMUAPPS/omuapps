from collections.abc import AsyncGenerator, Mapping

from omu.event_emitter import Unlisten
from omu.extension.table import Table, TableConfig, TableType
from omu.extension.table.table import TableEvents, TablePermissions
from omu.helper import AsyncCallback, Coro
from omu.identifier import Identifier
from omu.serializer import Serializable

from .server_table import ServerTable


class SerializeAdapter[T](dict[str, T]):
    def __init__(self, cache: Mapping[str, bytes], serializer: Serializable[T, bytes]):
        self._cache = cache
        self._serializer = serializer

    def __getitem__(self, key: str) -> T:
        return self._serializer.deserialize(self._cache[key])


class SerializedTable[T](Table[T]):
    def __init__(self, table: ServerTable, type: TableType[T]):
        self._table = table
        self._type = type
        self._event = TableEvents[T](self)
        self._proxies: list[Coro[[T], T | None]] = []
        self._chunk_size = 100
        self._permissions: TablePermissions | None = None
        self.permission_read: Identifier | None = None
        self.permission_write: Identifier | None = None
        self._listening = False
        table.event.cache_update += self.on_cache_update
        table.event.add += self.on_add
        table.event.update += self.on_update
        table.event.remove += self.on_remove
        table.event.clear += self.on_clear

    @property
    def cache(self) -> Mapping[str, T]:
        return SerializeAdapter(self._table.cache, self._type.serializer)

    def set_permissions(
        self,
        /,
        all: Identifier | None = None,
        read: Identifier | None = None,
        write: Identifier | None = None,
        remove: Identifier | None = None,
        proxy: Identifier | None = None,
    ) -> None:
        self._permissions = TablePermissions(
            all=all,
            read=read,
            write=write,
            remove=remove,
            proxy=proxy,
        )
        self._table.set_permissions(self._permissions)

    def set_config(self, config: TableConfig) -> None:
        self._table.set_config(config)

    def set_cache_size(self, size: int) -> None:
        self._table.set_cache_size(size)

    async def get(self, key: str) -> T | None:
        if key in self._table.cache:
            return self._type.serializer.deserialize(self._table.cache[key])
        item = await self._table.get(key)
        if item is None:
            return None
        return self._type.serializer.deserialize(item)

    async def get_many(self, *keys: str) -> dict[str, T]:
        items = await self._table.get_many(*keys)
        return {key: self._type.serializer.deserialize(item) for key, item in items.items()}

    async def add(self, *items: T) -> None:
        data = {self._type.key_function(item): self._type.serializer.serialize(item) for item in items}
        await self._table.add(data)

    async def update(self, *items: T) -> None:
        data = {self._type.key_function(item): self._type.serializer.serialize(item) for item in items}
        await self._table.update(data)

    async def remove(self, *items: T) -> None:
        await self._table.remove([self._type.key_function(item) for item in items])

    async def clear(self) -> None:
        await self._table.clear()

    async def has(self, key: str) -> bool:
        return await self._table.has(key)

    async def has_many(self, *keys: str) -> dict[str, bool]:
        return await self._table.has_many(list(keys))

    async def has_all(self, *keys: str) -> bool:
        return await self._table.has_all(list(keys))

    async def has_any(self, *keys: str) -> bool:
        return await self._table.has_any(list(keys))

    async def fetch_items(
        self,
        limit: int,
        backward: bool = False,
        cursor: str | None = None,
    ) -> dict[str, T]:
        items = await self._table.fetch_items(limit, backward, cursor)
        return self._parse_items(items)

    async def fetch_range(self, start: str, end: str) -> dict[str, T]:
        items = await self._table.fetch_range(start, end)
        return self._parse_items(items)

    async def fetch_all(self) -> dict[str, T]:
        items = await self._table.fetch_all()
        return self._parse_items(items)

    async def iterate(
        self,
        backward: bool = False,
        cursor: str | None = None,
    ) -> AsyncGenerator[T, None]:
        while True:
            items = await self.fetch_items(
                limit=self._chunk_size,
                backward=backward,
                cursor=cursor,
            )
            if len(items) == 0:
                break
            for item in items.values():
                yield item
            cursor = next(iter(items.keys()))

    async def size(self) -> int:
        return await self._table.size()

    @property
    def event(self) -> TableEvents[T]:
        return self._event

    def listen(self, listener: AsyncCallback[Mapping[str, T]] | None = None) -> Unlisten:
        self._listening = True
        if listener:
            return self._event.cache_update.listen(listener)
        return lambda: None

    async def on_cache_update(self, cache: Mapping[str, bytes]) -> None:
        await self._event.cache_update(self._parse_items(cache))

    async def on_add(self, items: Mapping[str, bytes]) -> None:
        _items = self._parse_items(items)
        await self._event.add(_items)

    async def on_update(self, items: Mapping[str, bytes]) -> None:
        _items = self._parse_items(items)
        await self._event.update(_items)

    async def on_remove(self, items: Mapping[str, bytes]) -> None:
        _items = self._parse_items(items)
        await self._event.remove(_items)

    async def on_clear(self) -> None:
        await self._event.clear()

    def proxy(self, callback: Coro[[T], T | None]) -> Unlisten:
        raise NotImplementedError

    def _parse_items(self, items: Mapping[str, bytes]) -> dict[str, T]:
        parsed: dict[str, T] = {}
        for key, item in items.items():
            item = self._type.serializer.deserialize(item)
            if not item:
                raise Exception(f"Failed to deserialize item {key}")
            parsed[key] = item
        return parsed

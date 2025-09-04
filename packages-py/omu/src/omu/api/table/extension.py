from __future__ import annotations

from collections.abc import AsyncGenerator, Iterable, Mapping

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.client import Client
from omu.event_emitter import Unlisten
from omu.helper import AsyncCallback, Coro
from omu.identifier import Identifier
from omu.interface import Keyable
from omu.network.packet.packet import PacketType
from omu.serializer import JsonSerializable, Serializer

from .packets import (
    SetConfigPacket,
    SetPermissionPacket,
    TableFetchPacket,
    TableFetchRangePacket,
    TableItemsPacket,
    TableKeysPacket,
    TablePacket,
    TableProxyPacket,
)
from .table import (
    Table,
    TableConfig,
    TableEvents,
    TablePermissions,
    TableType,
)

type ModelType[T: Keyable, D] = JsonSerializable[T, D]


class TableExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return TABLE_EXTENSION_TYPE

    def __init__(self, client: Client):
        self._client = client
        self._tables: dict[Identifier, Table] = {}
        client.network.register_packet(
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

    def create[T](
        self,
        table_type: TableType[T],
    ) -> Table[T]:
        self._client.permissions.require(TABLE_PERMISSION_ID)
        if self.has(table_type.id):
            raise ValueError(f"Table with identifier {table_type.id} already exists")
        table = TableImpl(
            self._client,
            table_type=table_type,
        )
        self._tables[table_type.id] = table
        return table

    def get[T](self, type: TableType[T]) -> Table[T]:
        if self.has(type.id):
            return self._tables[type.id]
        return self.create(type)

    def model[T: Keyable, D](self, id: Identifier, name: str, model_type: type[ModelType[T, D]]) -> Table[T]:
        id = id / name
        if self.has(id):
            raise ValueError(f"Table with identifier {id} already exists")
        table_type = TableType.create_model(id, name, model_type)
        return self.create(table_type)

    def has(self, id: Identifier) -> bool:
        return id in self._tables


TABLE_EXTENSION_TYPE = ExtensionType("table", lambda client: TableExtension(client), lambda: [])

TABLE_PERMISSION_ID = TABLE_EXTENSION_TYPE / "permission"

TABLE_SET_PERMISSION_PACKET = PacketType[SetPermissionPacket].create(
    TABLE_EXTENSION_TYPE,
    "set_permission",
    SetPermissionPacket,
)
TABLE_SET_CONFIG_PACKET = PacketType[SetConfigPacket].create(
    TABLE_EXTENSION_TYPE,
    "set_config",
    SetConfigPacket,
)
TABLE_LISTEN_PACKET = PacketType[Identifier].create_json(
    TABLE_EXTENSION_TYPE,
    "listen",
    serializer=Serializer.model(Identifier),
)
TABLE_PROXY_LISTEN_PACKET = PacketType[Identifier].create_json(
    TABLE_EXTENSION_TYPE,
    "proxy_listen",
    serializer=Serializer.model(Identifier),
)
TABLE_PROXY_PACKET = PacketType[TableProxyPacket].create_serialized(
    TABLE_EXTENSION_TYPE,
    "proxy",
    TableProxyPacket,
)
TABLE_ITEM_ADD_PACKET = PacketType[TableItemsPacket].create(
    TABLE_EXTENSION_TYPE,
    "item_add",
    TableItemsPacket,
)
TABLE_ITEM_UPDATE_PACKET = PacketType[TableItemsPacket].create(
    TABLE_EXTENSION_TYPE,
    "item_update",
    TableItemsPacket,
)
TABLE_ITEM_REMOVE_PACKET = PacketType[TableItemsPacket].create(
    TABLE_EXTENSION_TYPE,
    "item_remove",
    TableItemsPacket,
)
TABLE_ITEM_GET_ENDPOINT = EndpointType[TableKeysPacket, TableItemsPacket].create_serialized(
    TABLE_EXTENSION_TYPE,
    "item_get",
    request_serializer=TableKeysPacket,
    response_serializer=TableItemsPacket,
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_ITEM_HAS_ENDPOINT = EndpointType[TableKeysPacket, dict[str, bool]].create_serialized(
    TABLE_EXTENSION_TYPE,
    "item_has",
    request_serializer=TableKeysPacket,
    response_serializer=Serializer.json(),
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_ITEM_HAS_ALL_ENDPOINT = EndpointType[TableKeysPacket, bool].create_serialized(
    TABLE_EXTENSION_TYPE,
    "item_has_all",
    request_serializer=TableKeysPacket,
    response_serializer=Serializer.json(),
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_ITEM_HAS_ANY_ENDPOINT = EndpointType[TableKeysPacket, bool].create_serialized(
    TABLE_EXTENSION_TYPE,
    "item_has_any",
    request_serializer=TableKeysPacket,
    response_serializer=Serializer.json(),
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_FETCH_ENDPOINT = EndpointType[TableFetchPacket, TableItemsPacket].create_serialized(
    TABLE_EXTENSION_TYPE,
    "fetch",
    request_serializer=TableFetchPacket,
    response_serializer=TableItemsPacket,
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_FETCH_RANGE_ENDPOINT = EndpointType[TableFetchRangePacket, TableItemsPacket].create_serialized(
    TABLE_EXTENSION_TYPE,
    "fetch_range",
    request_serializer=TableFetchRangePacket,
    response_serializer=TableItemsPacket,
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_FETCH_ALL_ENDPOINT = EndpointType[TablePacket, TableItemsPacket].create_serialized(
    TABLE_EXTENSION_TYPE,
    "fetch_all",
    request_serializer=TablePacket,
    response_serializer=TableItemsPacket,
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_SIZE_ENDPOINT = EndpointType[TablePacket, int].create_serialized(
    TABLE_EXTENSION_TYPE,
    "size",
    request_serializer=TablePacket,
    response_serializer=Serializer.json(),
    permission_id=TABLE_PERMISSION_ID,
)
TABLE_ITEM_CLEAR_PACKET = PacketType[TablePacket].create(
    TABLE_EXTENSION_TYPE,
    "clear",
    TablePacket,
)


class TableImpl[T](Table[T]):
    def __init__(
        self,
        client: Client,
        table_type: TableType,
    ):
        self._client = client
        self._id = table_type.id
        self._serializer = table_type.serializer
        self._key_function = table_type.key_function
        self._cache: dict[str, T] = {}
        self._event = TableEvents[T](self)
        self._proxies: list[Coro[[T], T | None]] = []
        self._chunk_size = 100
        self._cache_size: int | None = None
        self._listening = False
        self._config: TableConfig | None = None
        self._permissions: TablePermissions | None = table_type.permissions

        client.network.add_packet_handler(
            TABLE_PROXY_PACKET,
            self._on_proxy,
        )
        client.network.add_packet_handler(
            TABLE_ITEM_ADD_PACKET,
            self._on_item_add,
        )
        client.network.add_packet_handler(
            TABLE_ITEM_UPDATE_PACKET,
            self._on_item_update,
        )
        client.network.add_packet_handler(
            TABLE_ITEM_REMOVE_PACKET,
            self._on_item_remove,
        )
        client.network.add_packet_handler(
            TABLE_ITEM_CLEAR_PACKET,
            self._on_item_clear,
        )
        client.network.add_task(self._on_ready)

    @property
    def cache(self) -> Mapping[str, T]:
        return self._cache

    async def get(self, key: str) -> T | None:
        if key in self._cache:
            return self._cache[key]
        res = await self._client.endpoints.call(TABLE_ITEM_GET_ENDPOINT, TableKeysPacket(id=self._id, keys=(key,)))
        items = self._parse_items(res.items)
        self._cache.update(items)
        if key in items:
            return items[key]
        return None

    async def get_many(self, *keys: str) -> dict[str, T]:
        res = await self._client.endpoints.call(TABLE_ITEM_GET_ENDPOINT, TableKeysPacket(id=self._id, keys=keys))
        items = self._parse_items(res.items)
        self._cache.update(items)
        return items

    async def add(self, *items: T) -> None:
        data = self._serialize_items(items)
        await self._client.send(TABLE_ITEM_ADD_PACKET, TableItemsPacket(id=self._id, items=data))

    async def update(self, *items: T) -> None:
        data = self._serialize_items(items)
        await self._client.send(TABLE_ITEM_UPDATE_PACKET, TableItemsPacket(id=self._id, items=data))

    async def remove(self, *items: T) -> None:
        data = self._serialize_items(items)
        await self._client.send(TABLE_ITEM_REMOVE_PACKET, TableItemsPacket(id=self._id, items=data))

    async def clear(self) -> None:
        await self._client.send(TABLE_ITEM_CLEAR_PACKET, TablePacket(id=self._id))

    async def has(self, key: str) -> bool:
        if key in self._cache:
            return True
        res = await self._client.endpoints.call(TABLE_ITEM_HAS_ENDPOINT, TableKeysPacket(id=self._id, keys=(key,)))
        return res[key]

    async def has_many(self, *keys: str) -> dict[str, bool]:
        res = await self._client.endpoints.call(TABLE_ITEM_HAS_ENDPOINT, TableKeysPacket(id=self._id, keys=keys))
        return res

    async def has_all(self, *keys: str) -> bool:
        res = await self._client.endpoints.call(TABLE_ITEM_HAS_ALL_ENDPOINT, TableKeysPacket(id=self._id, keys=keys))
        return res

    async def has_any(self, *keys: str) -> bool:
        res = await self._client.endpoints.call(TABLE_ITEM_HAS_ANY_ENDPOINT, TableKeysPacket(id=self._id, keys=keys))
        return res

    async def fetch_items(
        self,
        limit: int,
        backward: bool = False,
        cursor: str | None = None,
    ) -> dict[str, T]:
        items_response = await self._client.endpoints.call(
            TABLE_FETCH_ENDPOINT,
            TableFetchPacket(
                id=self._id,
                limit=limit,
                backward=backward,
                cursor=cursor,
            ),
        )
        items = self._parse_items(items_response.items)
        await self.update_cache(items)
        return items

    async def fetch_range(self, start: str, end: str) -> dict[str, T]:
        items_response = await self._client.endpoints.call(
            TABLE_FETCH_RANGE_ENDPOINT,
            TableFetchRangePacket(id=self._id, start=start, end=end),
        )
        items = self._parse_items(items_response.items)
        await self.update_cache(items)
        return items

    async def fetch_all(self) -> dict[str, T]:
        items_response = await self._client.endpoints.call(TABLE_FETCH_ALL_ENDPOINT, TablePacket(id=self._id))
        items = self._parse_items(items_response.items)
        await self.update_cache(items)
        return items

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
        res = await self._client.endpoints.call(TABLE_SIZE_ENDPOINT, TablePacket(id=self._id))
        return res

    def listen(self, listener: AsyncCallback[Mapping[str, T]] | None = None) -> Unlisten:
        if not self._listening:

            async def on_ready():
                await self._client.send(TABLE_LISTEN_PACKET, self._id)

            self._client.on_ready(on_ready)
            self._listening = True

        if listener is not None:
            return self._event.cache_update.listen(listener)
        return lambda: None

    def proxy(self, callback: Coro[[T], T | None]) -> Unlisten:
        if not self._proxies:

            async def listen():
                await self._client.send(TABLE_PROXY_LISTEN_PACKET, self._id)

            self._client.on_ready(listen)
        self._proxies.append(callback)
        return lambda: self._proxies.remove(callback)

    def set_config(self, config: TableConfig) -> None:
        if self._client.running:
            raise ValueError("Cannot set config after client has started")
        self._config = config

    async def _on_ready(self) -> None:
        if self._config is not None:
            await self._client.send(
                TABLE_SET_CONFIG_PACKET,
                SetConfigPacket(id=self._id, config=self._config),
            )
        if self._permissions is None:
            return
        if not self._id.is_subpath_of(self._client.app.id):
            return
        await self._client.send(
            TABLE_SET_PERMISSION_PACKET,
            SetPermissionPacket(
                id=self._id,
                all=self._permissions.all,
                read=self._permissions.read,
                write=self._permissions.write,
                remove=self._permissions.remove,
                proxy=self._permissions.proxy,
            ),
        )

    async def _on_proxy(self, packet: TableProxyPacket) -> None:
        if packet.id != self._id:
            return
        items = self._parse_items(packet.items)
        for proxy in self._proxies:
            for key, item in list(items.items()):
                updated_item = await proxy(item)
                if updated_item is None:
                    del items[key]
                else:
                    items[key] = updated_item
        serialized_items = self._serialize_items(items.values())
        await self._client.send(
            TABLE_PROXY_PACKET,
            TableProxyPacket(
                id=self._id,
                key=packet.key,
                items=serialized_items,
            ),
        )

    async def _on_item_add(self, packet: TableItemsPacket) -> None:
        if packet.id != self._id:
            return
        items = self._parse_items(packet.items)
        await self._event.add(items)
        await self.update_cache(items)

    async def _on_item_update(self, packet: TableItemsPacket) -> None:
        if packet.id != self._id:
            return
        items = self._parse_items(packet.items)
        await self._event.update(items)
        await self.update_cache(items)

    async def _on_item_remove(self, packet: TableItemsPacket) -> None:
        if packet.id != self._id:
            return
        items = self._parse_items(packet.items)
        await self._event.remove(items)
        for key in items.keys():
            if key not in self._cache:
                continue
            del self._cache[key]
        await self._event.cache_update(self._cache)

    async def _on_item_clear(self, packet: TablePacket) -> None:
        if packet.id != self._id:
            return
        await self._event.clear()
        self._cache.clear()
        await self._event.cache_update(self._cache)

    async def update_cache(self, items: Mapping[str, T]) -> None:
        if self._cache_size is None:
            self._cache = {**items}
        else:
            merged_cache = {**self._cache, **items}
            cache_array = tuple(merged_cache.items())
            self._cache = dict(cache_array[: self._cache_size])
        await self._event.cache_update(self._cache)

    def _parse_items(self, items: Mapping[str, bytes]) -> dict[str, T]:
        parsed_items: Mapping[str, T] = {}
        for key, item_bytes in items.items():
            item = self._serializer.deserialize(item_bytes)
            if item is None:
                raise ValueError(f"Failed to deserialize item with key: {key}")
            parsed_items[key] = item
        return parsed_items

    def _serialize_items(self, items: Iterable[T]) -> Mapping[str, bytes]:
        serialized_items: Mapping[str, bytes] = {}
        for item in items:
            key = self._key_function(item)
            serialized_items[key] = self._serializer.serialize(item)
        return serialized_items

    def set_cache_size(self, size: int | None) -> None:
        self._cache_size = size

    @property
    def event(self) -> TableEvents[T]:
        return self._event

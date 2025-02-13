from __future__ import annotations

import abc
from collections.abc import AsyncGenerator, Mapping

from omu.event_emitter import EventEmitter
from omu.extension.table import TableConfig
from omu.extension.table.table import TablePermissions
from omu.identifier import Identifier

from omuserver.session import Session

from .adapters.tableadapter import TableAdapter

type Json = str | int | float | bool | None | dict[str, Json] | list[Json]


class ServerTable(abc.ABC):
    @abc.abstractmethod
    async def load(self) -> None: ...

    @abc.abstractmethod
    async def store(self) -> None: ...

    @property
    @abc.abstractmethod
    def id(self) -> Identifier: ...

    @property
    @abc.abstractmethod
    def cache(self) -> Mapping[str, bytes]: ...

    @abc.abstractmethod
    def set_config(self, config: TableConfig) -> None: ...

    @property
    @abc.abstractmethod
    def permissions(self) -> TablePermissions | None: ...

    @abc.abstractmethod
    def set_permissions(self, permissions: TablePermissions) -> None: ...

    @abc.abstractmethod
    def set_cache_size(self, size: int) -> None: ...

    @property
    @abc.abstractmethod
    def adapter(self) -> TableAdapter | None: ...

    @abc.abstractmethod
    def set_adapter(self, adapter: TableAdapter) -> None: ...

    @abc.abstractmethod
    def attach_session(self, session: Session) -> None: ...

    @abc.abstractmethod
    def detach_session(self, session: Session) -> None: ...

    @abc.abstractmethod
    def attach_proxy_session(self, session: Session) -> None: ...

    @abc.abstractmethod
    async def proxy(self, session: Session, key: int, items: Mapping[str, bytes]) -> int: ...

    @abc.abstractmethod
    async def get(self, key: str) -> bytes | None: ...

    @abc.abstractmethod
    async def get_many(self, *keys: str) -> dict[str, bytes]: ...

    @abc.abstractmethod
    async def add(self, items: Mapping[str, bytes]) -> None: ...

    @abc.abstractmethod
    async def update(self, items: Mapping[str, bytes]) -> None: ...

    @abc.abstractmethod
    async def remove(self, keys: list[str] | tuple[str, ...]) -> None: ...

    @abc.abstractmethod
    async def clear(self) -> None: ...

    @abc.abstractmethod
    async def has(self, key: str) -> bool: ...

    @abc.abstractmethod
    async def has_many(self, keys: list[str] | tuple[str, ...]) -> dict[str, bool]: ...

    @abc.abstractmethod
    async def has_all(self, keys: list[str] | tuple[str, ...]) -> bool: ...

    @abc.abstractmethod
    async def has_any(self, keys: list[str] | tuple[str, ...]) -> bool: ...

    @abc.abstractmethod
    async def fetch_items(
        self,
        limit: int,
        backward: bool = False,
        cursor: str | None = None,
    ) -> dict[str, bytes]: ...

    @abc.abstractmethod
    async def fetch_range(self, start: str, end: str) -> dict[str, bytes]: ...

    @abc.abstractmethod
    async def fetch_all(self) -> dict[str, bytes]: ...

    @abc.abstractmethod
    async def iterate(self) -> AsyncGenerator[bytes, None]: ...

    @abc.abstractmethod
    async def size(self) -> int: ...

    @property
    @abc.abstractmethod
    def event(self) -> ServerTableEvents: ...


class ServerTableEvents:
    def __init__(self) -> None:
        self.add = EventEmitter[Mapping[str, bytes]]()
        self.update = EventEmitter[Mapping[str, bytes]]()
        self.remove = EventEmitter[Mapping[str, bytes]]()
        self.clear = EventEmitter[[]]()
        self.cache_update = EventEmitter[Mapping[str, bytes]]()

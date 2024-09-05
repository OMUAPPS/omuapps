from __future__ import annotations

import abc
from collections.abc import Mapping
from pathlib import Path


class TableAdapter(abc.ABC):
    @classmethod
    @abc.abstractmethod
    def create(cls, path: Path) -> TableAdapter: ...

    @abc.abstractmethod
    async def store(self): ...

    @abc.abstractmethod
    async def load(self): ...

    @abc.abstractmethod
    async def get(self, key: str) -> bytes | None: ...

    @abc.abstractmethod
    async def get_many(self, keys: list[str] | tuple[str, ...]) -> dict[str, bytes]: ...

    @abc.abstractmethod
    async def set(self, key: str, value: bytes) -> None: ...

    @abc.abstractmethod
    async def set_all(self, items: Mapping[str, bytes]) -> None: ...

    @abc.abstractmethod
    async def remove(self, key: str) -> None: ...

    @abc.abstractmethod
    async def remove_all(self, keys: list[str] | tuple[str, ...]) -> None: ...

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
    async def first(self) -> str | None: ...

    @abc.abstractmethod
    async def last(self) -> str | None: ...

    @abc.abstractmethod
    async def clear(self) -> None: ...

    @abc.abstractmethod
    async def size(self) -> int: ...

from __future__ import annotations

import abc
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, NotRequired, TypedDict

from omu.event_emitter import Unlisten
from omu.helper import Coro, map_optional
from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


class RegistryPermissionsJSON(TypedDict):
    all: NotRequired[str | None]
    read: NotRequired[str | None]
    write: NotRequired[str | None]


@dataclass(frozen=True, slots=True)
class RegistryPermissions:
    all: Identifier | None = None
    read: Identifier | None = None
    write: Identifier | None = None

    @classmethod
    def from_json(cls, data: RegistryPermissionsJSON) -> RegistryPermissions:
        return RegistryPermissions(
            map_optional(data.get("all"), Identifier.from_key),
            map_optional(data.get("read"), Identifier.from_key),
            map_optional(data.get("write"), Identifier.from_key),
        )

    def to_json(self) -> RegistryPermissionsJSON:
        return RegistryPermissionsJSON(
            all=map_optional(self.all, Identifier.key),
            read=map_optional(self.read, Identifier.key),
            write=map_optional(self.write, Identifier.key),
        )


@dataclass(frozen=True, slots=True)
class RegistryType[T]:
    id: Identifier
    default_value: T
    serializer: Serializable[T, bytes]
    permissions: RegistryPermissions = RegistryPermissions()

    @classmethod
    def create_json(
        cls,
        identifier: Identifier,
        name: str,
        default_value: T,
        permissions: RegistryPermissions | None = None,
    ) -> RegistryType[T]:
        return cls(
            identifier / name,
            default_value,
            Serializer.json(),
            permissions or RegistryPermissions(),
        )

    @classmethod
    def create_serialized(
        cls,
        identifier: Identifier,
        name: str,
        default_value: T,
        serializer: Serializable[T, bytes],
        permissions: RegistryPermissions | None = None,
    ) -> RegistryType[T]:
        return cls(
            identifier / name,
            default_value,
            serializer,
            permissions or RegistryPermissions(),
        )


class Registry[T](abc.ABC):
    @property
    @abc.abstractmethod
    def value(self) -> T: ...

    @abc.abstractmethod
    async def get(self) -> T: ...

    @abc.abstractmethod
    async def set(self, value: T) -> None: ...

    @abc.abstractmethod
    async def update(self, handler: Coro[[T], T] | Callable[[T], T]) -> T: ...

    @abc.abstractmethod
    async def modify(self, handler: Coro[[T], Any] | Callable[[T], Any]) -> T: ...

    @abc.abstractmethod
    def listen(self, handler: Coro[[T], None]) -> Unlisten: ...

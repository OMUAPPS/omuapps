from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, NotRequired, TypedDict

from omu.event_emitter import Unlisten
from omu.helper import Coro, map_optional
from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


class SignalPermissionsJSON(TypedDict):
    all: NotRequired[str | None]
    listen: NotRequired[str | None]
    notify: NotRequired[str | None]


@dataclass(frozen=True, slots=True)
class SignalPermissions:
    all: Identifier | None = None
    listen: Identifier | None = None
    notify: Identifier | None = None

    def to_json(self) -> SignalPermissionsJSON:
        return {
            "all": map_optional(self.all, Identifier.key),
            "listen": map_optional(self.listen, Identifier.key),
            "notify": map_optional(self.notify, Identifier.key),
        }

    @classmethod
    def from_json(cls, item: SignalPermissionsJSON) -> SignalPermissions:
        return SignalPermissions(
            all=map_optional(item.get("all"), Identifier.from_key),
            listen=map_optional(item.get("listen"), Identifier.from_key),
            notify=map_optional(item.get("notify"), Identifier.from_key),
        )


@dataclass(frozen=True, slots=True)
class SignalType[T]:
    id: Identifier
    serializer: Serializable[T, bytes]
    permissions: SignalPermissions = SignalPermissions()

    @classmethod
    def create_json(
        cls,
        identifier: Identifier,
        name: str,
        serializer: Serializable[T, Any] | None = None,
        permissions: SignalPermissions | None = None,
    ):
        return cls(
            id=identifier / name,
            serializer=Serializer.of(serializer or Serializer.noop()).to_json(),
            permissions=permissions or SignalPermissions(),
        )

    @classmethod
    def create_serialized(
        cls,
        identifier: Identifier,
        name: str,
        serializer: Serializable[T, bytes],
        permissions: SignalPermissions | None = None,
    ):
        return cls(
            id=identifier / name,
            serializer=serializer,
            permissions=permissions or SignalPermissions(),
        )


class Signal[T](abc.ABC):
    @abc.abstractmethod
    def listen(self, listener: Coro[[T], None]) -> Unlisten: ...

    @abc.abstractmethod
    async def notify(self, body: T) -> None: ...

from __future__ import annotations

import abc
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from omu.bytebuffer import ByteReader, ByteWriter, Flags
from omu.event_emitter import Unlisten
from omu.helper import Coro, map_optional
from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


@dataclass(frozen=True, slots=True)
class RegistryPermissions:
    all: Identifier | None = None
    read: Identifier | None = None
    write: Identifier | None = None

    def serialize(self, writer: ByteWriter) -> None:
        flags = Flags(0, 3)
        flags.set(0, self.all is not None)
        flags.set(1, self.read is not None)
        flags.set(2, self.write is not None)
        writer.write_flags(flags)
        if self.all is not None:
            writer.write_string(self.all.key())
        if self.read is not None:
            writer.write_string(self.read.key())
        if self.write is not None:
            writer.write_string(self.write.key())

    @classmethod
    def deserialize(cls, reader: ByteReader) -> RegistryPermissions:
        flags = reader.read_flags(3)
        all_id = reader.read_string() if flags.has(0) else None
        read_id = reader.read_string() if flags.has(1) else None
        write_id = reader.read_string() if flags.has(2) else None
        return RegistryPermissions(
            map_optional(all_id, Identifier.from_key),
            map_optional(read_id, Identifier.from_key),
            map_optional(write_id, Identifier.from_key),
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

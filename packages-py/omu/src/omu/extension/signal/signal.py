from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any

from omu.bytebuffer import ByteReader, ByteWriter, Flags
from omu.event_emitter import Unlisten
from omu.helper import Coro
from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


@dataclass(frozen=True, slots=True)
class SignalPermissions:
    all: Identifier | None = None
    listen: Identifier | None = None
    notify: Identifier | None = None

    def serialize(self, writer: ByteWriter) -> None:
        flags = Flags(length=3)
        flags.set(0, self.all is not None)
        flags.set(1, self.listen is not None)
        flags.set(2, self.notify is not None)
        writer.write_uint8(flags.value)
        if self.all is not None:
            writer.write_string(self.all.key())
        if self.listen is not None:
            writer.write_string(self.listen.key())
        if self.notify is not None:
            writer.write_string(self.notify.key())

    @classmethod
    def deserialize(cls, reader: ByteReader) -> SignalPermissions:
        flags = Flags(reader.read_uint8())
        all = flags.if_set(0, lambda: Identifier.from_key(reader.read_string()))
        listen = flags.if_set(1, lambda: Identifier.from_key(reader.read_string()))
        send = flags.if_set(2, lambda: Identifier.from_key(reader.read_string()))
        return SignalPermissions(all=all, listen=listen, notify=send)


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

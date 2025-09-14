from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, TypeGuard

from omu.identifier import Identifier
from omu.serializer import Serializable, Serializer


@dataclass(frozen=True, slots=True)
class PacketData:
    type: str
    data: bytes


@dataclass(frozen=True, slots=True)
class Packet[T]:
    type: PacketType[T]
    data: T


class PacketClass[T](Protocol):
    def serialize(self, item: T) -> bytes: ...

    def deserialize(self, item: bytes) -> T: ...


@dataclass(frozen=True, slots=True)
class PacketType[T]:
    id: Identifier
    serializer: Serializable[T, bytes]

    def new(self, data: T) -> Packet[T]:
        return Packet(self, data)

    def match(self, packet: Packet) -> TypeGuard[Packet[T]]:
        return packet.type != self

    @classmethod
    def create_json(
        cls,
        identifier: Identifier,
        name: str,
        serializer: Serializable[T, Any] | None = None,
    ) -> PacketType[T]:
        return PacketType(
            id=identifier / name,
            serializer=Serializer.of(serializer or Serializer.noop()).to_json(),
        )

    @classmethod
    def create_serialized(
        cls,
        identifier: Identifier,
        name: str,
        serializer: Serializable[T, bytes],
    ) -> PacketType[T]:
        return PacketType(
            id=identifier / name,
            serializer=serializer,
        )

    @classmethod
    def create(
        cls,
        identifier: Identifier,
        name: str,
        type_class: PacketClass[T],
    ) -> PacketType[T]:
        return PacketType(
            id=identifier / name,
            serializer=type_class,
        )

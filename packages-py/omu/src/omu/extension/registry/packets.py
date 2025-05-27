from __future__ import annotations

from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier

from .registry import RegistryPermissions


@dataclass(frozen=True, slots=True)
class RegistryPacket:
    id: Identifier
    value: bytes | None

    @classmethod
    def serialize(cls, item: RegistryPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_boolean(item.value is not None)
        if item.value is not None:
            writer.write_uint8_array(item.value)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> RegistryPacket:
        with ByteReader(item) as reader:
            key = Identifier.from_key(reader.read_string())
            existing = reader.read_boolean()
            value = reader.read_uint8_array() if existing else None
        return RegistryPacket(key, value)


@dataclass(frozen=True, slots=True)
class RegistryRegisterPacket:
    id: Identifier
    permissions: RegistryPermissions

    @classmethod
    def serialize(cls, item: RegistryRegisterPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        item.permissions.serialize(writer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> RegistryRegisterPacket:
        with ByteReader(item) as reader:
            key = Identifier.from_key(reader.read_string())
            permissions = RegistryPermissions.deserialize(reader)
        return RegistryRegisterPacket(key, permissions)

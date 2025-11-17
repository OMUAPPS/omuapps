from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict

from omu.bytebuffer import ByteReader, ByteWriter
from omu.helper import map_optional
from omu.identifier import Identifier

from .registry import RegistryPermissions, RegistryPermissionsJSON


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


class RegisterPacketJSON(TypedDict):
    id: str
    permissions: RegistryPermissionsJSON


@dataclass(frozen=True, slots=True)
class RegisterPacket:
    id: Identifier
    permissions: RegistryPermissions

    @classmethod
    def serialize(cls, item: RegisterPacket) -> RegisterPacketJSON:
        return {
            "id": item.id.key(),
            "permissions": item.permissions.to_json(),
        }

    @classmethod
    def deserialize(cls, item: RegisterPacketJSON) -> RegisterPacket:
        perms = item["permissions"]
        return RegisterPacket(
            id=Identifier.from_key(item["id"]),
            permissions=RegistryPermissions(
                all=map_optional(perms.get("all"), Identifier.from_key),
                read=map_optional(perms.get("read"), Identifier.from_key),
                write=map_optional(perms.get("write"), Identifier.from_key),
            ),
        )

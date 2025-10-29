from __future__ import annotations

from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier

from .signal import SignalPermissions


@dataclass(frozen=True, slots=True)
class SignalPacket:
    id: Identifier
    body: bytes

    @classmethod
    def serialize(cls, item: SignalPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uint8_array(item.body)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> SignalPacket:
        with ByteReader(item) as reader:
            key = Identifier.from_key(reader.read_string())
            body = reader.read_uint8_array()
        return SignalPacket(id=key, body=body)


@dataclass(frozen=True, slots=True)
class SignalRegisterPacket:
    id: Identifier
    permissions: SignalPermissions

    @classmethod
    def serialize(cls, item: SignalRegisterPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        item.permissions.serialize(writer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> SignalRegisterPacket:
        with ByteReader(item) as reader:
            key = Identifier.from_key(reader.read_string())
            permissions = SignalPermissions.deserialize(reader)
        return SignalRegisterPacket(id=key, permissions=permissions)

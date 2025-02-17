from __future__ import annotations

from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier


@dataclass(frozen=True, slots=True)
class EndpointRegisterPacket:
    endpoints: dict[Identifier, Identifier | None]

    @classmethod
    def serialize(cls, item: EndpointRegisterPacket) -> bytes:
        writer = ByteWriter()
        writer.write_int(len(item.endpoints))
        for key, value in item.endpoints.items():
            writer.write_string(key.key())
            writer.write_string(value.key() if value else "")
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointRegisterPacket:
        with ByteReader(item) as reader:
            count = reader.read_int()
            endpoints = {}
            for _ in range(count):
                key = reader.read_string()
                value = reader.read_string()
                endpoints[Identifier.from_key(key)] = Identifier.from_key(value) if value else None
        return EndpointRegisterPacket(endpoints=endpoints)


@dataclass(frozen=True, slots=True)
class EndpointDataPacket:
    id: Identifier
    key: int
    data: bytes

    @classmethod
    def serialize(cls, item: EndpointDataPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_int(item.key)
        writer.write_byte_array(item.data)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointDataPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            key = reader.read_int()
            data = reader.read_byte_array()
        return EndpointDataPacket(id=Identifier.from_key(id), key=key, data=data)


@dataclass(frozen=True, slots=True)
class EndpointErrorPacket:
    id: Identifier
    key: int
    error: str

    @classmethod
    def serialize(cls, item: EndpointErrorPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_int(item.key)
        writer.write_string(item.error)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointErrorPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            key = reader.read_int()
            error = reader.read_string()
        return EndpointErrorPacket(
            id=Identifier.from_key(id),
            key=key,
            error=error,
        )

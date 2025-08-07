from __future__ import annotations

import json
from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier


@dataclass(frozen=True, slots=True)
class EndpointRegisterPacket:
    endpoints: dict[Identifier, Identifier | None]

    @classmethod
    def serialize(cls, item: EndpointRegisterPacket) -> bytes:
        writer = ByteWriter()
        writer.write_uleb128(len(item.endpoints))
        for key, value in item.endpoints.items():
            writer.write_string(key.key())
            writer.write_string(value.key() if value else "")
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointRegisterPacket:
        with ByteReader(item) as reader:
            count = reader.read_uleb128()
            endpoints = {}
            for _ in range(count):
                key = reader.read_string()
                value = reader.read_string()
                endpoints[Identifier.from_key(key)] = Identifier.from_key(value) if value else None
        return EndpointRegisterPacket(endpoints=endpoints)


@dataclass(frozen=True, slots=True)
class InvokedParams:
    id: Identifier
    caller: Identifier
    key: int

    @staticmethod
    def serialize(item: InvokedParams) -> str:
        return json.dumps(
            {
                "id": item.id.key(),
                "caller": item.caller.key(),
                "key": item.key,
            }
        )

    @staticmethod
    def deserialize(item: str) -> InvokedParams:
        data = json.loads(item)
        assert isinstance(data["id"], str)
        assert isinstance(data["caller"], str)
        assert isinstance(data["key"], int)
        return InvokedParams(
            id=Identifier.from_key(data["id"]),
            caller=Identifier.from_key(data["caller"]),
            key=data["key"],
        )


@dataclass(frozen=True, slots=True)
class EndpointInvokedPacket:
    params: InvokedParams
    buffer: bytes

    @classmethod
    def serialize(cls, item: EndpointInvokedPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(InvokedParams.serialize(item.params))
        writer.write_uint8_array(item.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointInvokedPacket:
        with ByteReader(item) as reader:
            params = InvokedParams.deserialize(reader.read_string())
            buffer = reader.read_uint8_array()
        return EndpointInvokedPacket(
            params=params,
            buffer=buffer,
        )


@dataclass(frozen=True, slots=True)
class InvokeParams:
    id: Identifier
    key: int

    @staticmethod
    def serialize(item: InvokeParams) -> str:
        return json.dumps(
            {
                "id": item.id.key(),
                "key": item.key,
            }
        )

    @staticmethod
    def deserialize(item: str) -> InvokeParams:
        data = json.loads(item)
        assert isinstance(data["id"], str)
        assert isinstance(data["key"], int)
        return InvokeParams(
            id=Identifier.from_key(data["id"]),
            key=data["key"],
        )


@dataclass(frozen=True, slots=True)
class EndpointInvokePacket:
    params: InvokeParams
    buffer: bytes

    @classmethod
    def serialize(cls, item: EndpointInvokePacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(InvokeParams.serialize(item.params))
        writer.write_uint8_array(item.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointInvokePacket:
        with ByteReader(item) as reader:
            params = InvokeParams.deserialize(reader.read_string())
            buffer = reader.read_uint8_array()
        return EndpointInvokePacket(
            params=params,
            buffer=buffer,
        )


@dataclass(frozen=True, slots=True)
class ResponseParams:
    id: Identifier
    key: int
    error: str | None

    @staticmethod
    def serialize(item: ResponseParams) -> str:
        return json.dumps(
            {
                "id": item.id.key(),
                "key": item.key,
                "error": item.error,
            }
        )

    @staticmethod
    def deserialize(item: str) -> ResponseParams:
        data = json.loads(item)
        assert isinstance(data["id"], str)
        assert isinstance(data["key"], int)
        assert isinstance(data["error"], str | None)
        return ResponseParams(
            id=Identifier.from_key(data["id"]),
            key=data["key"],
            error=data["error"],
        )


@dataclass(frozen=True, slots=True)
class EndpointResponsePacket:
    params: ResponseParams
    buffer: bytes

    @classmethod
    def serialize(cls, item: EndpointResponsePacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(ResponseParams.serialize(item.params))
        writer.write_uint8_array(item.buffer)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> EndpointResponsePacket:
        with ByteReader(item) as reader:
            params = ResponseParams.deserialize(reader.read_string())
            buffer = reader.read_uint8_array()
        return EndpointResponsePacket(
            params=params,
            buffer=buffer,
        )

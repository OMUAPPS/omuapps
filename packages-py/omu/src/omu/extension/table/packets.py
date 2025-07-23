from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter, Flags
from omu.helper import map_optional
from omu.identifier import Identifier

from .table import TableConfig


@dataclass(frozen=True, slots=True)
class TablePacket:
    id: Identifier

    @classmethod
    def serialize(cls, item: TablePacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TablePacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
        return TablePacket(id=Identifier.from_key(id))


@dataclass(frozen=True, slots=True)
class TableItemsPacket:
    id: Identifier
    items: Mapping[str, bytes]

    @classmethod
    def serialize(cls, item: TableItemsPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uleb128(len(item.items))
        for key, value in item.items.items():
            writer.write_string(key)
            writer.write_uint8_array(value)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TableItemsPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            item_count = reader.read_uleb128()
            items: Mapping[str, bytes] = {}
            for _ in range(item_count):
                item_key = reader.read_string()
                value = reader.read_uint8_array()
                items[item_key] = value
        return TableItemsPacket(id=Identifier.from_key(id), items=items)


@dataclass(frozen=True, slots=True)
class TableKeysPacket:
    id: Identifier
    keys: tuple[str, ...]

    @classmethod
    def serialize(cls, item: TableKeysPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uleb128(len(item.keys))
        for key in item.keys:
            writer.write_string(key)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TableKeysPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            key_count = reader.read_uleb128()
            keys = [reader.read_string() for _ in range(key_count)]
        return TableKeysPacket(id=Identifier.from_key(id), keys=tuple(keys))


@dataclass(frozen=True, slots=True)
class TableProxyPacket:
    id: Identifier
    items: Mapping[str, bytes]
    key: int

    @classmethod
    def serialize(cls, item: TableProxyPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uleb128(item.key)
        writer.write_uleb128(len(item.items))
        for key, value in item.items.items():
            writer.write_string(key)
            writer.write_uint8_array(value)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TableProxyPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            key = reader.read_uleb128()
            item_count = reader.read_uleb128()
            items: Mapping[str, bytes] = {}
            for _ in range(item_count):
                item_key = reader.read_string()
                value = reader.read_uint8_array()
                items[item_key] = value
        return TableProxyPacket(
            id=Identifier.from_key(id),
            key=key,
            items=items,
        )


@dataclass(frozen=True, slots=True)
class TableFetchPacket:
    id: Identifier
    limit: int
    backward: bool
    cursor: str | None

    @classmethod
    def serialize(cls, item: TableFetchPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_uleb128(item.limit)
        flags = Flags(length=2)
        if item.backward:
            flags.set(0)
        if item.cursor is not None:
            flags.set(1)
        writer.write_flags(flags)
        if item.cursor is not None:
            writer.write_string(item.cursor)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TableFetchPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            limit = reader.read_uleb128()
            flags = reader.read_flags(length=2)
            backward = flags.get(0)
            cursor = reader.read_string() if flags.has(1) else None
        return TableFetchPacket(
            id=Identifier.from_key(id),
            limit=limit,
            backward=backward,
            cursor=cursor,
        )


@dataclass(frozen=True, slots=True)
class TableFetchRangePacket:
    id: Identifier
    start: str
    end: str

    @classmethod
    def serialize(cls, item: TableFetchRangePacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_string(item.start)
        writer.write_string(item.end)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> TableFetchRangePacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            start = reader.read_string()
            end = reader.read_string()
        return TableFetchRangePacket(id=Identifier.from_key(id), start=start, end=end)


@dataclass(frozen=True, slots=True)
class SetConfigPacket:
    id: Identifier
    config: TableConfig

    @classmethod
    def serialize(cls, item: SetConfigPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_string(json.dumps(item.config))
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> SetConfigPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            config = json.loads(reader.read_string())
        return SetConfigPacket(id=Identifier.from_key(id), config=config)


@dataclass(frozen=True, slots=True)
class SetPermissionPacket:
    id: Identifier
    all: Identifier | None = None
    read: Identifier | None = None
    write: Identifier | None = None
    remove: Identifier | None = None
    proxy: Identifier | None = None

    @staticmethod
    def serialize(item: SetPermissionPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        flags = 0
        if item.all is not None:
            flags |= 0b1
        if item.read is not None:
            flags |= 0b10
        if item.write is not None:
            flags |= 0b100
        if item.remove is not None:
            flags |= 0b1000
        if item.proxy is not None:
            flags |= 0b10000
        writer.write_uint8(flags)
        if item.all is not None:
            writer.write_string(item.all.key())
        if item.read is not None:
            writer.write_string(item.read.key())
        if item.write is not None:
            writer.write_string(item.write.key())
        if item.remove is not None:
            writer.write_string(item.remove.key())
        if item.proxy is not None:
            writer.write_string(item.proxy.key())
        return writer.finish()

    @staticmethod
    def deserialize(item: bytes) -> SetPermissionPacket:
        with ByteReader(item) as reader:
            id = reader.read_string()
            flags = reader.read_uint8()
            permission = reader.read_string() if flags & 0b1 else None
            permission_read = reader.read_string() if flags & 0b10 else None
            permission_write = reader.read_string() if flags & 0b100 else None
            permission_remove = reader.read_string() if flags & 0b1000 else None
            permission_proxy = reader.read_string() if flags & 0b10000 else None
        return SetPermissionPacket(
            id=Identifier.from_key(id),
            all=map_optional(permission, Identifier.from_key),
            read=map_optional(permission_read, Identifier.from_key),
            write=map_optional(permission_write, Identifier.from_key),
            remove=map_optional(permission_remove, Identifier.from_key),
            proxy=map_optional(permission_proxy, Identifier.from_key),
        )

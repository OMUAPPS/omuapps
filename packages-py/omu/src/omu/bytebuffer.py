from __future__ import annotations

import io
from collections.abc import Callable


class Flags:
    def __init__(self, value: int = 0, length: int = 32) -> None:
        self.value = value & ((1 << length) - 1)
        self.length = length

    def has(self, position: int) -> bool:
        return bool(self.value & (1 << position))

    def get(self, position: int) -> bool:
        return bool(self.value & (1 << position))

    def if_set[T](self, position: int, callback: Callable[[], T]) -> T | None:
        if self.has(position):
            return callback()
        return None

    def set(self, position: int, value: bool = True) -> Flags:
        if value:
            self.value |= 1 << position
        else:
            self.value &= ~(1 << position)
        return self

    def unset(self, position: int) -> Flags:
        self.value &= ~(1 << position)
        return self

    def write(self, writer: ByteWriter) -> ByteWriter:
        bits = self.value.to_bytes((self.length + 7) // 8, "big")
        writer.write(bits)
        return writer

    @classmethod
    def read(cls, reader: ByteReader, length: int) -> Flags:
        bits = int.from_bytes(reader.read((length + 7) // 8), "big")
        return Flags(bits, length)

    def __or__(self, other: Flags) -> Flags:
        return Flags(self.value | other.value, max(self.length, other.length))

    def __and__(self, other: Flags) -> Flags:
        return Flags(self.value & other.value, max(self.length, other.length))

    def __xor__(self, other: Flags) -> Flags:
        return Flags(self.value ^ other.value, max(self.length, other.length))

    def __invert__(self) -> Flags:
        return Flags(~self.value, self.length)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Flags):
            return False
        return self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)


class ByteWriter:
    def __init__(self, init: bytes | None = None) -> None:
        self.stream = io.BytesIO(init or b"")
        self.finished = False

    def write(self, data: bytes) -> ByteWriter:
        if self.finished:
            raise ValueError("Writer already finished")
        self.stream.write(data)
        return self

    def write_boolean(self, value: bool) -> ByteWriter:
        self.write(value.to_bytes(1, "big"))
        return self

    def write_big_int(self, value: int) -> ByteWriter:
        self.write(value.to_bytes(8, "big"))
        return self

    def write_int(self, value: int) -> ByteWriter:
        self.write(value.to_bytes(4, "big"))
        return self

    def write_short(self, value: int) -> ByteWriter:
        self.write(value.to_bytes(2, "big"))
        return self

    def write_byte(self, value: int) -> ByteWriter:
        self.write(value.to_bytes(1, "big"))
        return self

    def write_byte_array(self, value: bytes) -> ByteWriter:
        if len(value) > 0xFFFFFFFF:
            raise ValueError("Byte array too large")
        self.write_int(len(value))
        self.write(value)
        return self

    def write_string(self, value: str) -> ByteWriter:
        self.write_byte_array(value.encode("utf-8"))
        return self

    def write_flags(self, flags: Flags) -> ByteWriter:
        flags.write(self)
        return self

    def finish(self) -> bytes:
        if self.finished:
            raise ValueError("Writer already finished")
        self.finished = True
        return self.stream.getvalue()


class ByteReader:
    def __init__(self, buffer: bytes) -> None:
        self.stream = io.BytesIO(buffer)
        self.is_reading = False
        self.is_finished = False

    def __enter__(self) -> ByteReader:
        if self.is_reading:
            raise ValueError("Reader already reading")
        if self.is_finished:
            raise ValueError("Reader already finished")
        self.is_reading = True
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        if self.stream.read(1):
            raise ValueError("Reader not fully consumed")
        self.is_reading = False
        self.is_finished = True

    def read(self, size: int) -> bytes:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        if size < 0:
            raise ValueError("Size must be positive")
        return self.stream.read(size)

    def read_boolean(self) -> bool:
        return bool(int.from_bytes(self.read(1), "big"))

    def read_big_int(self) -> int:
        return int.from_bytes(self.read(8), "big")

    def read_int(self) -> int:
        return int.from_bytes(self.read(4), "big")

    def read_short(self) -> int:
        return int.from_bytes(self.read(2), "big")

    def read_byte(self) -> int:
        return int.from_bytes(self.read(1), "big")

    def read_byte_array(self) -> bytes:
        length = self.read_int()
        return self.read(length)

    def read_string(self) -> str:
        return self.read_byte_array().decode("utf-8")

    def read_flags(self, length: int) -> Flags:
        return Flags.read(self, length)

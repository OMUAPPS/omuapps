from __future__ import annotations

import io
import struct
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


type ByteArray = bytearray | bytes


class ByteWriter:
    def __init__(self, init: ByteArray | None = None) -> None:
        self.stream = io.BytesIO(init or b"")
        self.finished = False

    def write(self, data: ByteArray) -> ByteWriter:
        if self.finished:
            raise ValueError("Writer already finished")
        self.stream.write(data)
        return self

    def write_boolean(self, value: bool) -> ByteWriter:
        self.write(value.to_bytes(1, "big"))
        return self

    def write_int8(self, value: int) -> ByteWriter:
        if not (-128 <= value < 128):
            raise ValueError("Value must be in range -128 to 127")
        self.write(value.to_bytes(1, "big", signed=True))
        return self

    def write_uint8(self, value: int) -> ByteWriter:
        if not (0 <= value < 256):
            raise ValueError("Value must be in range 0-255")
        self.write(value.to_bytes(1, "big"))
        return self

    def write_int16(self, value: int) -> ByteWriter:
        if not (-32768 <= value < 32768):
            raise ValueError("Value must be in range -32768 to 32767")
        self.write(value.to_bytes(2, "big", signed=True))
        return self

    def write_uint16(self, value: int) -> ByteWriter:
        if not (0 <= value < 65536):
            raise ValueError("Value must be in range 0-65535")
        self.write(value.to_bytes(2, "big"))
        return self

    def write_int32(self, value: int) -> ByteWriter:
        if not (-2147483648 <= value < 2147483648):
            raise ValueError("Value must be in range -2147483648 to 2147483647")
        self.write(value.to_bytes(4, "big", signed=True))
        return self

    def write_uint32(self, value: int) -> ByteWriter:
        if not (0 <= value < 4294967296):
            raise ValueError("Value must be in range 0-4294967295")
        self.write(value.to_bytes(4, "big"))
        return self

    def write_int64(self, value: int) -> ByteWriter:
        if not (-9223372036854775808 <= value < 9223372036854775808):
            raise ValueError("Value must be in range -9223372036854775808 to 9223372036854775807")
        self.write(value.to_bytes(8, "big", signed=True))
        return self

    def write_uint64(self, value: int) -> ByteWriter:
        if not (0 <= value < 18446744073709551616):
            raise ValueError("Value must be in range 0-18446744073709551615")
        self.write(value.to_bytes(8, "big"))
        return self

    def write_uleb128(self, value: int) -> ByteWriter:
        if value < 0:
            raise ValueError("Value must be non-negative")
        while value > 127:
            self.write(bytes([(value & 0x7F) | 0x80]))
            value >>= 7
        self.write(bytes([value & 0x7F]))
        return self

    def write_float16(self, value: float) -> ByteWriter:
        if not (-65504.0 <= value <= 65504.0):
            raise ValueError("Value must be in range -65504.0 to 65504.0")
        self.write(struct.pack(">e", value))
        return self

    def write_float32(self, value: float) -> ByteWriter:
        self.write(struct.pack(">f", value))
        return self

    def write_float64(self, value: float) -> ByteWriter:
        self.write(struct.pack(">d", value))
        return self

    def write_uint8_array(self, values: ByteArray) -> ByteWriter:
        self.write_uleb128(len(values))
        self.write(values)
        return self

    def write_string(self, value: str) -> ByteWriter:
        encoded = value.encode("utf-8")
        self.write_uleb128(len(encoded))
        self.write(encoded)
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
    def __init__(self, buffer: ByteArray) -> None:
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

    def finish(self) -> None:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        if self.stream.read(1):
            raise ValueError("Reader not fully consumed")
        self.is_reading = False
        self.is_finished = True

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        self.finish()

    def read(self, size: int) -> bytes:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        if size < 0:
            raise ValueError("Size must be positive")
        return self.stream.read(size)

    def read_boolean(self) -> bool:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return bool(int.from_bytes(self.read(1), "big"))

    def read_int8(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(1), "big", signed=True)

    def read_uint8(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(1), "big")

    def read_int16(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(2), "big", signed=True)

    def read_uint16(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(2), "big")

    def read_int32(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(4), "big", signed=True)

    def read_uint32(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(4), "big")

    def read_int64(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(8), "big", signed=True)

    def read_uint64(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return int.from_bytes(self.read(8), "big")

    def read_uleb128(self) -> int:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        value = 0
        shift = 0
        while True:
            byte = self.read(1)[0]
            value |= (byte & 0x7F) << shift
            if not (byte & 0x80):
                break
            shift += 7
        return value

    def read_float16(self) -> float:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return struct.unpack(">e", self.read(2))[0]

    def read_float32(self) -> float:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return struct.unpack(">f", self.read(4))[0]

    def read_float64(self) -> float:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return struct.unpack(">d", self.read(8))[0]

    def read_uint8_array(self) -> bytes:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        length = self.read_uleb128()
        return self.read(length)

    def read_string(self) -> str:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        length = self.read_uleb128()
        return self.read(length).decode("utf-8")

    def read_flags(self, length: int) -> Flags:
        if not self.is_reading:
            raise ValueError("Reader not reading")
        return Flags.read(self, length)

from __future__ import annotations

from dataclasses import dataclass

from omu.bytebuffer import ByteReader, ByteWriter


@dataclass(frozen=True, slots=True)
class ConsolePacket:
    lines: list[str]

    @classmethod
    def serialize(cls, item: ConsolePacket) -> bytes:
        writer = ByteWriter()
        writer.write_uleb128(len(item.lines))
        for line in item.lines:
            writer.write_string(line)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> ConsolePacket:
        with ByteReader(item) as reader:
            line_count = reader.read_uleb128()
            lines = [reader.read_string() for _ in range(line_count)]
        return ConsolePacket(lines)

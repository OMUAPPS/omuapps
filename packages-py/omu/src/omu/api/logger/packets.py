from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from omu.bytebuffer import ByteReader, ByteWriter
from omu.identifier import Identifier


class LogType(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    DEBUG = "debug"


@dataclass(frozen=True, slots=True)
class LogMessage:
    type: LogType
    text: str

    @classmethod
    def error(cls, text: str) -> LogMessage:
        return LogMessage(LogType.ERROR, text)

    @classmethod
    def warning(cls, text: str) -> LogMessage:
        return LogMessage(LogType.WARNING, text)

    @classmethod
    def info(cls, text: str) -> LogMessage:
        return LogMessage(LogType.INFO, text)

    @classmethod
    def debug(cls, text: str) -> LogMessage:
        return LogMessage(LogType.DEBUG, text)


@dataclass(frozen=True, slots=True)
class LogPacket:
    id: Identifier
    message: LogMessage

    @classmethod
    def serialize(cls, item: LogPacket) -> bytes:
        writer = ByteWriter()
        writer.write_string(item.id.key())
        writer.write_string(item.message.type.value)
        writer.write_string(item.message.text)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> LogPacket:
        with ByteReader(item) as reader:
            id = Identifier.from_key(reader.read_string())
            type = LogType(reader.read_string())
            text = reader.read_string()
            message = LogMessage(type, text)
            return LogPacket(id, message)

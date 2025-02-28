from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, NotRequired, TypedDict

from omu.bytebuffer import ByteReader, ByteWriter
from omu.localization import LocalizedText
from omu.localization.locale import Locale


@dataclass(frozen=True, slots=True)
class ConsolePacket:
    lines: list[str]

    @classmethod
    def serialize(cls, item: ConsolePacket) -> bytes:
        writer = ByteWriter()
        writer.write_int(len(item.lines))
        for line in item.lines:
            writer.write_string(line)
        return writer.finish()

    @classmethod
    def deserialize(cls, item: bytes) -> ConsolePacket:
        with ByteReader(item) as reader:
            line_count = reader.read_int()
            lines = [reader.read_string() for _ in range(line_count)]
        return ConsolePacket(lines)


class RemoteAppMetadata(TypedDict):
    locale: Locale
    name: NotRequired[LocalizedText | None]
    icon: NotRequired[LocalizedText | None]
    description: NotRequired[LocalizedText | None]


class RemoteAppRequestPayload(TypedDict):
    id: str
    url: str
    metadata: RemoteAppMetadata
    permissions: list[str]


class RequestRemoteAppResponseOk(TypedDict):
    type: Literal["success"]
    token: str
    lan_ip: str


class RequestRemoteAppResponseError(TypedDict):
    type: Literal["error"]
    message: str


type RequestRemoteAppResponse = RequestRemoteAppResponseOk | RequestRemoteAppResponseError

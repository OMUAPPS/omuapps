from __future__ import annotations

from enum import Enum
from typing import TypedDict

from omu.app import App, AppJson
from omu.identifier import Identifier
from omu.model import Model
from omu.serializer import Serializer

from .packet import PacketType


class ProtocolInfo(TypedDict):
    version: str


class ConnectPacketData(TypedDict):
    protocol: ProtocolInfo
    app: AppJson
    token: str | None


class ConnectPacket(Model[ConnectPacketData]):
    def __init__(
        self,
        app: App,
        protocol: ProtocolInfo,
        token: str | None = None,
    ):
        self.app = app
        self.protocol = protocol
        self.token = token

    def to_json(self) -> ConnectPacketData:
        return {
            "app": self.app.to_json(),
            "protocol": self.protocol,
            "token": self.token,
        }

    @classmethod
    def from_json(cls, json: ConnectPacketData) -> ConnectPacket:
        return cls(
            app=App.from_json(json["app"]),
            protocol=json["protocol"],
            token=json["token"],
        )


class DisconnectType(str, Enum):
    INVALID_TOKEN = "invalid_token"
    INVALID_ORIGIN = "invalid_origin"
    INVALID_VERSION = "invalid_version"
    INVALID_PACKET_TYPE = "invalid_packet_type"
    INVALID_PACKET_DATA = "invalid_packet_data"
    INVALID_PACKET = "invalid_packet"
    ANOTHER_CONNECTION = "another_connection"
    PERMISSION_DENIED = "permission_denied"
    SHUTDOWN = "shutdown"
    CLOSE = "close"


class DisconnectPacketData(TypedDict):
    type: str
    message: str | None


class DisconnectPacket(Model[DisconnectPacketData]):
    def __init__(self, type: DisconnectType, message: str | None = None):
        self.type: DisconnectType = type
        self.message = message

    def to_json(self) -> DisconnectPacketData:
        return {
            "type": self.type.value,
            "message": self.message,
        }

    @classmethod
    def from_json(cls, json: DisconnectPacketData) -> DisconnectPacket:
        return cls(
            type=DisconnectType(json["type"]),
            message=json["message"],
        )


IDENTIFIER = Identifier("core", "packet")


class PACKET_TYPES:
    CONNECT = PacketType.create_json(
        IDENTIFIER,
        "connect",
        Serializer.model(ConnectPacket),
    )
    DISCONNECT = PacketType.create_json(
        IDENTIFIER,
        "disconnect",
        Serializer.model(DisconnectPacket),
    )
    TOKEN = PacketType[str | None].create_json(
        IDENTIFIER,
        "token",
    )
    READY = PacketType[None].create_json(
        IDENTIFIER,
        "ready",
    )

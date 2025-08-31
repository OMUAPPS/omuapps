from __future__ import annotations

from enum import Enum
from typing import TypedDict

from omu.app import App, AppJson
from omu.identifier import Identifier

from .packet import PacketType


class ServerMetaJson(TypedDict):
    protocol: ProtocolInfo
    hash: str | None


class ProtocolInfo(TypedDict):
    version: str


class ConnectPacketData(TypedDict):
    protocol: ProtocolInfo
    app: AppJson
    token: str | None


class ConnectPacket:
    def __init__(
        self,
        app: App,
        protocol: ProtocolInfo,
        token: str | None = None,
    ):
        self.app = app
        self.protocol = protocol
        self.token = token

    @staticmethod
    def serialize(packet: ConnectPacket) -> ConnectPacketData:
        return {
            "app": packet.app.to_json(),
            "protocol": packet.protocol,
            "token": packet.token,
        }

    @staticmethod
    def deserialize(json: ConnectPacketData) -> ConnectPacket:
        return ConnectPacket(
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
    INTERNAL_ERROR = "internal_error"
    ANOTHER_CONNECTION = "another_connection"
    PERMISSION_DENIED = "permission_denied"
    SERVER_RESTART = "server_restart"
    SHUTDOWN = "shutdown"
    CLOSE = "close"


class DisconnectPacketData(TypedDict):
    type: str
    message: str | None


class DisconnectPacket:
    def __init__(self, type: DisconnectType, message: str | None = None):
        self.type: DisconnectType = type
        self.message = message

    @staticmethod
    def serialize(packet: DisconnectPacket) -> DisconnectPacketData:
        return {
            "type": packet.type.value,
            "message": packet.message,
        }

    @staticmethod
    def deserialize(json: DisconnectPacketData) -> DisconnectPacket:
        return DisconnectPacket(
            type=DisconnectType(json["type"]),
            message=json["message"],
        )


IDENTIFIER = Identifier("core", "packet")


class PACKET_TYPES:
    SERVER_META = PacketType[ServerMetaJson].create_json(
        IDENTIFIER,
        "server_meta",
    )
    CONNECT = PacketType[ConnectPacket].create_json(
        IDENTIFIER,
        "connect",
        ConnectPacket,
    )
    DISCONNECT = PacketType[DisconnectPacket].create_json(
        IDENTIFIER,
        "disconnect",
        DisconnectPacket,
    )
    TOKEN = PacketType[str | None].create_json(
        IDENTIFIER,
        "token",
    )
    READY = PacketType[None].create_json(
        IDENTIFIER,
        "ready",
    )

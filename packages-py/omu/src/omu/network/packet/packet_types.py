from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Literal, TypedDict

from omu.app import App, AppJson
from omu.identifier import Identifier
from omu.serializer import Serializer

from .packet import PacketType


class ProtocolInfo(TypedDict):
    brand: str
    version: str


class RSANumbers(TypedDict):
    e: str
    n: str


class EncryptionRequest(TypedDict):
    kind: Literal["v1"]
    rsa: RSANumbers


class EncryptionResponse(TypedDict):
    kind: Literal["v1"]
    rsa: RSANumbers
    aes: str


class ServerMeta(TypedDict):
    protocol: ProtocolInfo
    encryption: EncryptionRequest | None
    hash: str | None


class ConnectPacketData(TypedDict):
    protocol: ProtocolInfo
    app: AppJson
    token: str
    encryption: EncryptionResponse | None


@dataclass(frozen=True, slots=True)
class ConnectPacket:
    app: App
    protocol: ProtocolInfo
    token: str
    encryption: EncryptionResponse | None = None

    @staticmethod
    def serialize(packet: ConnectPacket) -> ConnectPacketData:
        return {
            "app": packet.app.to_json(),
            "protocol": packet.protocol,
            "encryption": packet.encryption,
            "token": packet.token,
        }

    @staticmethod
    def deserialize(json: ConnectPacketData) -> ConnectPacket:
        return ConnectPacket(
            app=App.from_json(json["app"]),
            protocol=json["protocol"],
            token=json["token"],
            encryption=json["encryption"],
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


CORE_ID = Identifier("core", "packet")


class Authenticate(TypedDict):
    kind: Literal["v1"]
    token: str


"""
[C->S] connect to server
[C<-S] rsa public key sharing and send metadata to authenticate if target is a valid server.
[C->S] rsa public key sharing and send AES CBC key
// Encryption starts here and all packets are encrypted with AES CBC using the shared key
"""


class PACKET_TYPES:
    SERVER_META = PacketType[ServerMeta].create_json(
        CORE_ID,
        "server_meta",
    )
    CONNECT = PacketType[ConnectPacket].create_json(
        CORE_ID,
        "connect",
        ConnectPacket,
    )
    DISCONNECT = PacketType[DisconnectPacket].create_json(
        CORE_ID,
        "disconnect",
        DisconnectPacket,
    )
    TOKEN = PacketType[str | None].create_json(
        CORE_ID,
        "token",
    )
    READY = PacketType[None].create_json(
        CORE_ID,
        "ready",
    )
    ENCRYPTED_PACKET = PacketType[bytes].create_serialized(
        CORE_ID,
        name="e",
        serializer=Serializer.noop(),
    )

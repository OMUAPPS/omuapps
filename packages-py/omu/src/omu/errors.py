from omu.identifier import Identifier
from omu.network.packet.packet_types import DisconnectType


class OmuError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class DisconnectReason(OmuError):
    def __init__(self, type: DisconnectType, message: str | None = None, *args, **kwargs):
        super().__init__(message or type.value, *args, **kwargs)
        self.type = type
        self.message = message


class NetworkError(OmuError):
    pass


class AnotherConnection(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.ANOTHER_CONNECTION, *args, **kwargs)


class PermissionDenied(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.PERMISSION_DENIED, *args, **kwargs)


class InvalidToken(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.INVALID_TOKEN, *args, **kwargs)


class InvalidOrigin(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.INVALID_ORIGIN, *args, **kwargs)


class InvalidVersion(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.INVALID_VERSION, *args, **kwargs)


class InvalidPacket(NetworkError, DisconnectReason):
    def __init__(self, *args, **kwargs):
        super().__init__(DisconnectType.INVALID_PACKET, *args, **kwargs)


class InvalidPacketType(InvalidPacket):
    def __init__(self, packet_type: Identifier):
        message = f"Invalid packet type {packet_type}"
        super().__init__(DisconnectType.INVALID_PACKET_TYPE, message)
        self.packet_type = packet_type


class InvalidPacketData(InvalidPacket):
    def __init__(self, packet_type: Identifier, message: str):
        message = f"Invalid packet data for {packet_type}: {message}"
        super().__init__(DisconnectType.INVALID_PACKET_DATA, message)
        self.packet_type = packet_type

from __future__ import annotations

import abc

from omu.errors import NetworkError
from omu.network.packet import Packet, PacketData, PacketType
from omu.result import Err, Ok, Result
from omu.serializer import Serializable


class CloseError(NetworkError): ...


class ConnectionClosed(NetworkError): ...


class ErrorReceiving(NetworkError): ...


class InvalidPacket(NetworkError): ...


type ReceiveError = ConnectionClosed | ErrorReceiving | InvalidPacket


class Transport(abc.ABC):
    @abc.abstractmethod
    async def connect(self) -> Connection: ...


class Connection(abc.ABC):
    @abc.abstractmethod
    async def send(
        self,
        packet: Packet,
        packet_mapper: Serializable[Packet, PacketData],
    ) -> None: ...

    @abc.abstractmethod
    async def receive(
        self,
        packet_mapper: Serializable[Packet, PacketData],
    ) -> Result[Packet, ReceiveError]: ...

    async def receive_as[T](
        self,
        packet_mapper: Serializable[Packet, PacketData],
        packet_type: PacketType[T],
    ) -> Result[T, ReceiveError]:
        packet = await self.receive(packet_mapper)
        if packet.is_err is True:
            return Err(packet.err)
        packet = packet.value
        if packet.type != packet_type:
            return Err(InvalidPacket(f"Expected {packet_type.id} but got {packet.type}"))
        return Ok(packet.data)

    @abc.abstractmethod
    async def close(self) -> None: ...

    @property
    @abc.abstractmethod
    def closed(self) -> bool: ...

from __future__ import annotations

import abc

from omu.network.packet import Packet, PacketData
from omu.serializer import Serializable


class CloseError(Exception):
    pass


class Connection(abc.ABC):
    @abc.abstractmethod
    async def connect(self): ...

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
    ) -> Packet: ...

    @abc.abstractmethod
    async def close(self) -> None: ...

    @property
    @abc.abstractmethod
    def closed(self) -> bool: ...

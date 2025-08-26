from __future__ import annotations

import asyncio

from omu.network.connection import Connection
from omu.network.packet import Packet, PacketData
from omu.serializer import Serializable


class PluginConnection(Connection):
    def __init__(self) -> None:
        self._connected = False
        self._to_client_queue = asyncio.Queue[Packet]()
        self._to_server_queue = asyncio.Queue[Packet]()

    async def receive(self, packet_mapper: Serializable[Packet, PacketData]) -> Packet:
        return await self._to_client_queue.get()

    def add_receive(self, packet: Packet) -> None:
        self._to_client_queue.put_nowait(packet)

    async def send(self, packet: Packet, packet_mapper: Serializable[Packet, PacketData]) -> None:
        self._to_server_queue.put_nowait(packet)

    async def dequeue_to_server_packet(self) -> Packet:
        return await self._to_server_queue.get()

    @property
    def closed(self) -> bool:
        return not self._connected

    async def close(self) -> None:
        self._connected = False

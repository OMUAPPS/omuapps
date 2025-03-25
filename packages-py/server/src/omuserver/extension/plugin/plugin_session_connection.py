from __future__ import annotations

from loguru import logger
from omu.network import Packet
from omu.network.packet_mapper import PacketMapper
from omu.result import Ok, Result

from omuserver.session import ReceiveError, SessionConnection

from .plugin_connection import PluginConnection


class PluginSessionConnection(SessionConnection):
    def __init__(self, connection: PluginConnection) -> None:
        self.connection = connection

    @property
    def closed(self) -> bool:
        return self.connection.closed

    async def receive(self, packet_mapper: PacketMapper) -> Result[Packet, ReceiveError]:
        return Ok(await self.connection.dequeue_to_server_packet())

    async def close(self) -> None:
        try:
            await self.connection.close()
        except Exception as e:
            logger.warning(f"Error closing socket: {e}")
            logger.error(e)

    async def send(self, packet: Packet, packet_mapper: PacketMapper) -> None:
        if self.closed:
            raise ValueError("Socket is closed")
        self.connection.add_receive(packet)

    def __repr__(self) -> str:
        return f"PluginSessionConnection({self.connection})"

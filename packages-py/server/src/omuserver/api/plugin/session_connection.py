from __future__ import annotations

from loguru import logger
from omu.network import Packet
from omu.network.packet_mapper import PacketMapper
from omu.result import Err, Ok, Result

from omuserver.session import ReceiveError, SessionConnection

from .transport import PluginConnection


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

    async def send(self, packet: Packet, packet_mapper: PacketMapper) -> Result[..., str]:
        if self.closed:
            return Err("Socket is closed")
        self.connection.add_receive(packet)
        return Ok(...)

    def __repr__(self) -> str:
        return f"PluginSessionConnection({self.connection})"

from __future__ import annotations

from aiohttp import web
from loguru import logger
from omu.bytebuffer import ByteReader, ByteWriter
from omu.network.connection import ConnectionClosed, ErrorReceiving
from omu.network.packet import Packet, PacketData
from omu.network.packet_mapper import PacketMapper
from omu.result import Err, Ok, Result

from omuserver.session import InvalidPacket, ReceiveError, SessionConnection


class WebsocketsConnection(SessionConnection):
    def __init__(self, socket: web.WebSocketResponse) -> None:
        self.socket = socket

    @property
    def closed(self) -> bool:
        return self.socket.closed

    async def receive(self, packet_mapper: PacketMapper) -> Result[Packet, ReceiveError]:
        msg = await self.socket.receive()
        if msg.type in {
            web.WSMsgType.CLOSE,
            web.WSMsgType.CLOSING,
            web.WSMsgType.CLOSED,
        }:
            return Err(ConnectionClosed("Socket is closed"))
        if msg.type == web.WSMsgType.ERROR:
            return Err(ErrorReceiving(f"Error receiving message: {msg.data}"))
        if msg.data is None:
            return Err(ErrorReceiving("Received empty message"))
        if msg.type != web.WSMsgType.BINARY:
            return Err(InvalidPacket(f"Unknown message type {msg.type}: {msg.data}"))

        with ByteReader(msg.data) as reader:
            event_type = reader.read_string()
            event_data = reader.read_uint8_array()
        packet_data = PacketData(event_type, event_data)
        try:
            return Ok(packet_mapper.deserialize(packet_data))
        except Exception as err:
            logger.opt(exception=err).error("Failed to deserialize packet")
            return Err(InvalidPacket(f"Failed to deserialize packet: {packet_data.type}"))

    async def close(self) -> None:
        try:
            await self.socket.close()
        except Exception as e:
            logger.warning(f"Error closing socket: {e}")
            logger.error(e)

    async def send(self, packet: Packet, packet_mapper: PacketMapper) -> None:
        if self.closed:
            raise ValueError("Socket is closed")
        packet_data = packet_mapper.serialize(packet)
        writer = ByteWriter()
        writer.write_string(packet_data.type)
        writer.write_uint8_array(packet_data.data)
        await self.socket.send_bytes(writer.finish())

from __future__ import annotations

from dataclasses import dataclass

import aiohttp
from aiohttp import ClientWebSocketResponse, web

from omu.address import Address
from omu.bytebuffer import ByteReader, ByteWriter
from omu.serializer import Serializable

from .connection import CloseError, Connection, Transport
from .packet import Packet, PacketData


@dataclass(frozen=True, slots=True)
class WebsocketsTransport(Transport):
    address: Address

    @property
    def _ws_endpoint(self) -> str:
        protocol = "wss" if self.address.secure else "ws"
        host = self.address.host or "127.0.0.1"
        port = self.address.port
        return f"{protocol}://{host}:{port}/ws"

    async def connect(self) -> WebsocketsConnection:
        session = aiohttp.ClientSession()
        socket = await session.ws_connect(self._ws_endpoint)
        return WebsocketsConnection(socket)


@dataclass(frozen=True, slots=True)
class WebsocketsConnection(Connection):
    socket: ClientWebSocketResponse

    async def send(self, packet: Packet, packet_mapper: Serializable[Packet, PacketData]) -> None:
        if not self.socket or self.socket.closed:
            raise RuntimeError("Not connected")
        packet_data = packet_mapper.serialize(packet)
        writer = ByteWriter()
        writer.write_string(packet_data.type)
        writer.write_uint8_array(packet_data.data)
        await self.socket.send_bytes(writer.finish())

    async def receive(self, packet_mapper: Serializable[Packet, PacketData]) -> Packet:
        if not self.socket or self.socket.closed:
            raise RuntimeError("Not connected")
        msg = await self.socket.receive()
        if msg.type in {
            web.WSMsgType.CLOSE,
            web.WSMsgType.CLOSED,
            web.WSMsgType.CLOSING,
            web.WSMsgType.ERROR,
        }:
            raise CloseError(f"Socket {msg.type.name.lower()}")
        if msg.data is None:
            raise RuntimeError("Received empty message")
        if msg.type == web.WSMsgType.TEXT:
            raise RuntimeError("Received text message")
        elif msg.type == web.WSMsgType.BINARY:
            with ByteReader(msg.data) as reader:
                event_type = reader.read_string()
                event_data = reader.read_uint8_array()
            packet_data = PacketData(event_type, event_data)
            return packet_mapper.deserialize(packet_data)
        else:
            raise RuntimeError(f"Unknown message type {msg.type}")

    async def close(self) -> None:
        if not self.socket or self.socket.closed:
            return
        await self.socket.close()

    @property
    def closed(self) -> bool:
        return not self.socket or self.socket.closed

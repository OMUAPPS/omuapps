from __future__ import annotations

import aiohttp
from aiohttp import web

from omu.address import Address
from omu.bytebuffer import ByteReader, ByteWriter
from omu.client import Client
from omu.serializer import Serializable

from .connection import CloseError, Connection
from .packet import Packet, PacketData


class WebsocketsConnection(Connection):
    def __init__(self, client: Client, address: Address):
        self._client = client
        self._address = address
        self._connected = False
        self._socket: aiohttp.ClientWebSocketResponse | None = None
        self._session: aiohttp.ClientSession | None = None

    @property
    def _ws_endpoint(self) -> str:
        protocol = "wss" if self._address.secure else "ws"
        host = self._address.host or "127.0.0.1"
        port = self._address.port
        return f"{protocol}://{host}:{port}/ws"

    async def connect(self) -> None:
        if self._socket and not self._socket.closed:
            raise RuntimeError("Already connected")
        self._session = aiohttp.ClientSession()
        self._socket = await self._session.ws_connect(self._ws_endpoint)
        self._connected = True

    async def send(
        self, packet: Packet, packet_mapper: Serializable[Packet, PacketData]
    ) -> None:
        if not self._socket or self._socket.closed or not self._connected:
            raise RuntimeError("Not connected")
        packet_data = packet_mapper.serialize(packet)
        writer = ByteWriter()
        writer.write_string(packet_data.type)
        writer.write_byte_array(packet_data.data)
        await self._socket.send_bytes(writer.finish())

    async def receive(self, packet_mapper: Serializable[Packet, PacketData]) -> Packet:
        if not self._socket or self._socket.closed:
            raise RuntimeError("Not connected")
        msg = await self._socket.receive()
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
                event_data = reader.read_byte_array()
            packet_data = PacketData(event_type, event_data)
            return packet_mapper.deserialize(packet_data)
        else:
            raise RuntimeError(f"Unknown message type {msg.type}")

    async def close(self) -> None:
        if not self._socket or self._socket.closed:
            return
        await self._socket.close()
        self._socket = None
        self._connected = False

    @property
    def closed(self) -> bool:
        return not self._socket or self._socket.closed

    def __del__(self):
        if not self.closed:
            self._client.loop.create_task(self.close())
        if self._session:
            self._client.loop.create_task(self._session.close())

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Literal

from loguru import logger

from omu.address import Address
from omu.client import Client
from omu.errors import (
    AnotherConnection,
    InvalidOrigin,
    InvalidPacket,
    InvalidToken,
    InvalidVersion,
    OmuError,
    PermissionDenied,
)
from omu.event_emitter import EventEmitter
from omu.helper import Coro
from omu.identifier import Identifier
from omu.token import TokenProvider

from .connection import CloseError, Connection
from .packet import Packet, PacketType
from .packet.packet_types import (
    PACKET_TYPES,
    ConnectPacket,
    DisconnectPacket,
    DisconnectType,
)
from .packet_mapper import PacketMapper


@dataclass(frozen=True, slots=True)
class PacketHandler[T]:
    packet_type: PacketType[T]
    event: EventEmitter[T]


class Network:
    def __init__(
        self,
        client: Client,
        address: Address,
        token_provider: TokenProvider,
        connection: Connection,
    ):
        self._client = client
        self._address = address
        self._token_provider = token_provider
        self._connection = connection
        self._connected = False
        self._closed = False
        self._event = NetworkEvents()
        self._tasks: list[Coro[[], None]] = []
        self._packet_mapper = PacketMapper()
        self._packet_handlers: dict[Identifier, PacketHandler] = {}
        self.register_packet(
            PACKET_TYPES.CONNECT,
            PACKET_TYPES.DISCONNECT,
            PACKET_TYPES.TOKEN,
            PACKET_TYPES.READY,
        )
        self.add_packet_handler(PACKET_TYPES.TOKEN, self.handle_token)
        self.add_packet_handler(PACKET_TYPES.DISCONNECT, self.handle_disconnect)
        self.add_packet_handler(PACKET_TYPES.READY, self.handle_ready)

    async def handle_token(self, token: str | None):
        if token is None:
            return
        self._token_provider.store(self._address, self._client.app, token)

    async def handle_disconnect(self, reason: DisconnectPacket):
        if reason.type in {
            DisconnectType.SHUTDOWN,
            DisconnectType.CLOSE,
        }:
            return

        self._closed = True
        ERROR_MAP: dict[DisconnectType, type[OmuError]] = {
            DisconnectType.ANOTHER_CONNECTION: AnotherConnection,
            DisconnectType.PERMISSION_DENIED: PermissionDenied,
            DisconnectType.INVALID_TOKEN: InvalidToken,
            DisconnectType.INVALID_ORIGIN: InvalidOrigin,
            DisconnectType.INVALID_VERSION: InvalidVersion,
            DisconnectType.INVALID_PACKET: InvalidPacket,
            DisconnectType.INVALID_PACKET_TYPE: InvalidPacket,
            DisconnectType.INVALID_PACKET_DATA: InvalidPacket,
        }
        error = ERROR_MAP.get(reason.type)
        if error:
            raise error(reason.message)

    async def handle_ready(self, _: None):
        await self._client.event.ready.emit()

    @property
    def address(self) -> Address:
        return self._address

    def set_connection(self, connection: Connection) -> None:
        if self._connected:
            raise RuntimeError("Cannot change connection while connected")
        if self._connection:
            del self._connection
        self._connection = connection

    def set_token_provider(self, token_provider: TokenProvider) -> None:
        self._token_provider = token_provider

    def register_packet(self, *packet_types: PacketType) -> None:
        self._packet_mapper.register(*packet_types)
        for packet_type in packet_types:
            if self._packet_handlers.get(packet_type.id):
                raise ValueError(f"Packet type {packet_type.id} already registered")
            self._packet_handlers[packet_type.id] = PacketHandler(
                packet_type,
                EventEmitter(),
            )

    def add_packet_handler[T](
        self,
        packet_type: PacketType[T],
        packet_handler: Coro[[T], None] | None = None,
    ):
        if not self._packet_handlers.get(packet_type.id):
            raise ValueError(f"Packet type {packet_type.id} not registered")

        def decorator(func: Coro[[T], None]) -> None:
            self._packet_handlers[packet_type.id].event.listen(func)

        if packet_handler:
            decorator(packet_handler)
        return decorator

    @property
    def connected(self) -> bool:
        return self._connected

    async def connect(self, *, reconnect: bool = True) -> None:
        if self._connected:
            raise RuntimeError("Already connected")
        if self._closed:
            raise RuntimeError("Connection closed")

        await self.disconnect()
        try:
            await self._connection.connect()
        except Exception as e:
            if reconnect:
                logger.opt(exception=e).error("Failed to connect")
                await self.try_reconnect()
                return
            else:
                raise e
        self._connected = True
        await self.send(
            Packet(
                PACKET_TYPES.CONNECT,
                ConnectPacket(
                    app=self._client.app,
                    protocol={"version": self._client.version},
                    token=self._token_provider.get(self._address, self._client.app),
                ),
            )
        )
        listen_task = asyncio.create_task(self._listen_task())
        await self._event.status.emit("connected")
        await self._event.connected.emit()
        await self._dispatch_tasks()

        await self.send(Packet(PACKET_TYPES.READY, None))
        await listen_task

        if reconnect:
            await self.try_reconnect()

    async def try_reconnect(self) -> None:
        if self._closed:
            return
        await asyncio.sleep(1)
        await self.connect(reconnect=True)

    async def disconnect(self) -> None:
        if self._connection.closed:
            return
        self._connected = False
        await self._connection.close()
        await self._event.status.emit("disconnected")
        await self._event.disconnected.emit()

    async def send(self, packet: Packet) -> None:
        if not self._connected:
            raise RuntimeError("Not connected")
        await self._connection.send(packet, self._packet_mapper)

    async def _listen_task(self):
        try:
            while not self._connection.closed:
                packet = await self._connection.receive(self._packet_mapper)
                asyncio.create_task(self.dispatch_packet(packet))
        except CloseError as e:
            logger.opt(exception=e).error("Connection closed")
        finally:
            await self.disconnect()
            self._connected = False

    async def dispatch_packet(self, packet: Packet) -> None:
        await self._event.packet.emit(packet)
        packet_handler = self._packet_handlers.get(packet.type.id)
        if not packet_handler:
            return
        await packet_handler.event(packet.data)

    @property
    def event(self) -> NetworkEvents:
        return self._event

    def add_task(self, task: Coro[[], None]) -> None:
        if self._client.ready:
            raise RuntimeError("Cannot add task after client is ready")
        self._tasks.append(task)

    def remove_task(self, task: Coro[[], None]) -> None:
        self._tasks.remove(task)

    async def _dispatch_tasks(self) -> None:
        for task in self._tasks:
            await task()


type NetworkStatus = Literal["connecting", "connected", "disconnected"]


class NetworkEvents:
    def __init__(self) -> None:
        self.connected = EventEmitter[[]]()
        self.disconnected = EventEmitter[[]]()
        self.packet = EventEmitter[Packet]()
        self.status = EventEmitter[NetworkStatus]()

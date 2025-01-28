from __future__ import annotations

import abc
import asyncio
from dataclasses import dataclass
from typing import TYPE_CHECKING

from loguru import logger
from omu import App
from omu.app import AppType
from omu.errors import DisconnectReason
from omu.event_emitter import EventEmitter
from omu.helper import Coro
from omu.network.packet import PACKET_TYPES, Packet, PacketType
from omu.network.packet.packet_types import (
    ConnectPacket,
    DisconnectPacket,
    DisconnectType,
)
from omu.network.packet_mapper import PacketMapper
from result import Err, Ok

from omuserver.server import Server

if TYPE_CHECKING:
    from omuserver.security import PermissionHandle


class SessionConnection(abc.ABC):
    @abc.abstractmethod
    async def send(self, packet: Packet, packet_mapper: PacketMapper) -> None: ...

    @abc.abstractmethod
    async def receive(self, packet_mapper: PacketMapper) -> Packet | None: ...

    @abc.abstractmethod
    async def close(self) -> None: ...

    @property
    @abc.abstractmethod
    def closed(self) -> bool: ...


class SessionEvents:
    def __init__(self) -> None:
        self.packet = EventEmitter[Session, Packet]()
        self.disconnected = EventEmitter[Session](catch_errors=True)
        self.ready = EventEmitter[Session]()


@dataclass(frozen=True, slots=True)
class SessionTask:
    session: Session
    coro: Coro[[], None]
    name: str


class Session:
    def __init__(
        self,
        packet_mapper: PacketMapper,
        app: App,
        permission_handle: PermissionHandle,
        kind: AppType,
        connection: SessionConnection,
    ) -> None:
        self.packet_mapper = packet_mapper
        self.app = app
        self.permission_handle = permission_handle
        self.kind = kind
        self.connection = connection
        self.event = SessionEvents()
        self.ready_tasks: list[SessionTask] = []
        self.ready_waiters: list[asyncio.Future[None]] = []
        self.ready = False

    @classmethod
    async def from_connection(
        cls,
        server: Server,
        packet_mapper: PacketMapper,
        connection: SessionConnection,
    ) -> Session:
        packet = await connection.receive(packet_mapper)
        if packet is None:
            await connection.close()
            raise RuntimeError("Connection closed")
        if packet.type != PACKET_TYPES.CONNECT or not isinstance(packet.data, ConnectPacket):
            await connection.send(
                Packet(
                    PACKET_TYPES.DISCONNECT,
                    DisconnectPacket(DisconnectType.INVALID_PACKET_TYPE, "Expected connect"),
                ),
                packet_mapper,
            )
            await connection.close()
            raise RuntimeError(f"Expected {PACKET_TYPES.CONNECT.id} but got {packet.type}")
        connect_packet = packet.data
        app = connect_packet.app
        token = connect_packet.token

        verify_result = await server.permission_manager.verify_app_token(app, token)
        match verify_result:
            case Ok((kind, permission_handle, new_token)):
                session = Session(
                    packet_mapper=packet_mapper,
                    app=app,
                    permission_handle=permission_handle,
                    kind=kind,
                    connection=connection,
                )
                if session.kind != AppType.PLUGIN:
                    await session.send(PACKET_TYPES.TOKEN, new_token)
                return session
            case Err(error):
                await connection.send(
                    Packet(
                        PACKET_TYPES.DISCONNECT,
                        DisconnectPacket(DisconnectType.INVALID_TOKEN, error),
                    ),
                    packet_mapper,
                )
                await connection.close()
                raise RuntimeError(f"Invalid token for {app}: {error}")

    @property
    def closed(self) -> bool:
        return self.connection.closed

    async def disconnect(self, disconnect_type: DisconnectType, message: str | None = None) -> None:
        if not self.connection.closed:
            await self.send(PACKET_TYPES.DISCONNECT, DisconnectPacket(disconnect_type, message))
        await self.connection.close()
        await self.event.disconnected.emit(self)

    async def listen(self) -> None:
        while not self.connection.closed:
            packet = await self.connection.receive(self.packet_mapper)
            if packet is None:
                await self.disconnect(DisconnectType.CLOSE)
                return
            asyncio.create_task(self.dispatch_packet(packet))

    async def dispatch_packet(self, packet: Packet) -> None:
        try:
            await self.event.packet.emit(self, packet)
        except DisconnectReason as reason:
            logger.opt(exception=reason).error("Disconnecting session")
            await self.disconnect(reason.type, reason.message)

    async def send[T](self, packet_type: PacketType[T], data: T) -> None:
        await self.connection.send(Packet(packet_type, data), self.packet_mapper)

    def add_ready_task(self, coro: Coro[[], None]):
        if self.ready:
            raise RuntimeError("Session is already ready")
        task = SessionTask(
            session=self,
            coro=coro,
            name=coro.__name__,
        )
        self.ready_tasks.append(task)

    async def wait_ready(self) -> None:
        if self.ready:
            return
        waiter = asyncio.get_running_loop().create_future()
        self.ready_waiters.append(waiter)
        await waiter

    async def process_ready_tasks(self) -> None:
        if self.ready:
            raise RuntimeError("Session is already ready")
        self.ready = True
        for task in self.ready_tasks:
            await task.coro()
        self.ready_tasks.clear()
        for waiter in self.ready_waiters:
            waiter.set_result(None)
        await self.event.ready.emit(self)

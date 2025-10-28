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
from omu.identifier import Identifier
from omu.network.connection import InvalidPacket, ReceiveError
from omu.network.encryption import AES, Decryptor
from omu.network.packet import PACKET_TYPES, Packet, PacketType
from omu.network.packet.packet_types import DisconnectPacket, DisconnectType, ServerMeta
from omu.network.packet_mapper import PacketMapper
from omu.result import Err, Ok, Result

from omuserver.brand import BRAND
from omuserver.security import InputToken
from omuserver.version import VERSION

if TYPE_CHECKING:
    from omuserver.security import PermissionHandle
    from omuserver.server import Server


class SessionConnection(abc.ABC):
    @abc.abstractmethod
    async def send(self, packet: Packet, packet_mapper: PacketMapper) -> None: ...

    @abc.abstractmethod
    async def receive(self, packet_mapper: PacketMapper) -> Result[Packet, ReceiveError]: ...

    async def receive_as[T](self, packet_mapper: PacketMapper, packet_type: PacketType[T]) -> Result[T, ReceiveError]:
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


class SessionEvents:
    def __init__(self) -> None:
        self.disconnected = EventEmitter[Session](catch_errors=True)
        self.ready = EventEmitter[Session]()


class TaskPriority:
    AFTER_CONNECTED = 0
    AFTER_PLUGIN = 200
    AFTER_SESSION = 300
    AFTER_PERMITTED = 400


@dataclass(frozen=True, slots=True)
class SessionTask:
    session: Session
    coro: Coro[[], None]
    name: str
    detail: str | None = None
    priority: int = 0

    def __repr__(self) -> str:
        return f"SessionTask(name={self.name}, detail={self.detail}, priority={self.priority})"

    def __str__(self) -> str:
        return self.__repr__()


class Session:
    def __init__(
        self,
        server: Server,
        packet_mapper: PacketMapper,
        app: App,
        permission_handle: PermissionHandle,
        kind: AppType,
        connection: SessionConnection,
        aes: AES | None = None,
    ) -> None:
        self.server = server
        self.packet_mapper = packet_mapper
        self.app = app
        self.id = app.id
        self.permissions = permission_handle
        self.kind = kind
        self.connection = connection
        self.event = SessionEvents()
        self.ready_tasks: list[SessionTask] = []
        self.ready_waiters: list[asyncio.Future[None]] = []
        self.ready: bool = False
        self.aes = aes

    @classmethod
    async def from_connection(
        cls,
        server: Server,
        packet_mapper: PacketMapper,
        connection: SessionConnection,
    ) -> Session:
        decryptor = Decryptor.new()
        meta: ServerMeta = {
            "protocol": {
                "version": VERSION,
                "brand": BRAND,
            },
            "encryption": {
                "kind": "v1",
                "rsa": decryptor.to_request(),
            },
            "hash": server.address.hash,
        }
        await connection.send(PACKET_TYPES.SERVER_META.new(meta), packet_mapper)
        received = await connection.receive_as(packet_mapper, PACKET_TYPES.CONNECT)
        if received.is_err is True:
            await connection.send(
                PACKET_TYPES.DISCONNECT.new(DisconnectPacket(DisconnectType.INVALID_PACKET, received.err.message)),
                packet_mapper,
            )
            await connection.close()
            raise RuntimeError(f"Invalid packet received while connecting: {received.err}")
        else:
            packet = received.value
        aes: AES | None = None
        token = packet.token
        if packet.encryption:
            # encryptor = Encryptor.new(packet.encryption["rsa"])
            aes = AES.deserialize(packet.encryption["aes"], decryptor)
            if token:
                token = decryptor.decrypt_string(token)
        verify_result = server.security.verify_app(packet.app, InputToken(token))
        if verify_result.is_err is True:
            await connection.send(
                PACKET_TYPES.DISCONNECT.new(DisconnectPacket(DisconnectType.INVALID_TOKEN, verify_result.err)),
                packet_mapper,
            )
            await connection.close()
            raise RuntimeError(f"Invalid token for {packet.app}: {verify_result.err}")
        permission_handle, new_token = verify_result.value
        session = Session(
            server=server,
            packet_mapper=packet_mapper,
            app=packet.app,
            permission_handle=permission_handle,
            kind=packet.app.type or AppType.APP,
            connection=connection,
            aes=aes,
        )
        if session.kind not in {AppType.PLUGIN, AppType.DASHBOARD}:
            await session.send(PACKET_TYPES.TOKEN, new_token)
        return session

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
            received = await self.connection.receive(self.packet_mapper)
            if received.is_err is True:
                await self.disconnect(DisconnectType.INVALID_PACKET, received.err.message)
                return
            asyncio.create_task(self.dispatch_packet(received.value))

    async def dispatch_packet(self, packet: Packet) -> None:
        try:
            if self.aes:
                packet = self.packet_mapper.deserialize(self.aes.decrypt(packet))
            await self.server.packets.process_packet(self, packet)
        except DisconnectReason as reason:
            logger.opt(exception=reason).error("Disconnecting session")
            await self.disconnect(reason.type, reason.message)

    async def send[T](self, packet_type: PacketType[T], data: T) -> None:
        packet = Packet(packet_type, data)
        if self.aes:
            packet = self.aes.encrypt(self.packet_mapper.serialize(packet))
        await self.connection.send(packet, self.packet_mapper)

    def add_task(
        self,
        coro: Coro[[], None],
        name: str,
        detail: str | None = None,
        priority: int = 0,
    ) -> SessionTask:
        if self.ready:
            raise RuntimeError("Session is already ready")

        task = SessionTask(
            session=self,
            coro=coro,
            name=name,
            detail=detail,
            priority=priority,
        )
        self.ready_tasks.append(task)
        return task

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
        self.ready_tasks.sort(key=lambda t: t.priority)
        logger.debug(f"Session {self.app.key()} is ready, processing {self.ready_tasks} ready tasks")
        for task in self.ready_tasks:
            try:
                logger.debug(f"Processing ready task {task} for session {self.app.key()}")
                await task.coro()
            except Exception as e:
                logger.opt(exception=e).error(f"Error while processing ready task {task.name}")
                await self.disconnect(DisconnectType.INTERNAL_ERROR, "Error while processing ready tasks")
                return
        self.ready_tasks.clear()
        for waiter in self.ready_waiters:
            waiter.set_result(None)
        await self.event.ready.emit(self)
        self.ready = True

    def is_app_id(self, id: Identifier) -> bool:
        return self.app.id.is_namepath_equal(id, max_depth=1)

    def __repr__(self) -> str:
        return f"Session({self.app.key()}, kind={self.kind}, ready={self.ready})"

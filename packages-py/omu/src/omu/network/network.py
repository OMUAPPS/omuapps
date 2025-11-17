from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Literal

from loguru import logger

from omu.address import Address
from omu.app import AppType
from omu.brand import BRAND
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
from omu.omu import Omu
from omu.token import TokenProvider

from .connection import CloseError, Connection, Transport
from .encryption import AES, Decryptor, Encryptor
from .packet import Packet, PacketType
from .packet.packet_types import (
    PACKET_TYPES,
    ConnectPacket,
    DisconnectPacket,
    DisconnectType,
    EncryptionResponse,
)
from .packet_mapper import PacketMapper


@dataclass(frozen=True, slots=True)
class PacketHandler[T]:
    packet_type: PacketType[T]
    event: EventEmitter[T]


class Network:
    def __init__(
        self,
        omu: Omu,
        address: Address,
        token_provider: TokenProvider,
        transport: Transport,
        connection: Connection | None = None,
    ):
        self.omu = omu
        self.address = address
        self._token_provider = token_provider
        self.transport = transport
        self.connection: Connection | None = connection
        self._event = NetworkEvents()
        self._tasks: list[Coro[[], None]] = []
        self._packet_mapper = PacketMapper()
        self._packet_handlers: dict[Identifier, PacketHandler] = {}
        self.listen_task: asyncio.Task[None] | None = None
        self.register_packet(
            PACKET_TYPES.SERVER_META,
            PACKET_TYPES.CONNECT,
            PACKET_TYPES.DISCONNECT,
            PACKET_TYPES.TOKEN,
            PACKET_TYPES.READY,
            PACKET_TYPES.ENCRYPTED_PACKET,
        )
        self.add_packet_handler(PACKET_TYPES.TOKEN, self.handle_token)
        self.add_packet_handler(PACKET_TYPES.DISCONNECT, self.handle_disconnect)
        self.aes: AES | None = None

    async def handle_token(self, token: str | None):
        if token is None:
            return
        self._token_provider.store(self.address, self.omu.app, token)

    async def handle_disconnect(self, reason: DisconnectPacket):
        if reason.type in {
            DisconnectType.SHUTDOWN,
            DisconnectType.CLOSE,
            DisconnectType.SERVER_RESTART,
        }:
            return

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
            raise error(reason.message or reason.type.value)

    def set_connection(self, connection: Connection) -> None:
        if self.connection:
            raise RuntimeError("Cannot change connection while connected")
        if self.connection:
            del self.connection
        self.connection = connection

    def set_transport(self, transport: Transport) -> None:
        if self.connection:
            raise RuntimeError("Cannot change connection while connected")
        if self.connection:
            del self.connection
        self.transport = transport

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
        if not self.connection:
            return False
        return not self.connection.closed

    async def connect(self, *, reconnect: bool = True) -> None:
        if self.listen_task:
            raise RuntimeError("Already connected")

        exception: Exception | None = None
        attempts = 0
        while True:
            try:
                self.connection = self.connection or await self.transport.connect()

                meta = (await self.connection.receive_as(self._packet_mapper, PACKET_TYPES.SERVER_META)).unwrap()
                self.address = self.address.with_hash(meta["hash"])
                token = self._token_provider.get(self.address, self.omu.app)
                if token is None:
                    raise InvalidToken(f"No token for {self.address} and app {self.omu.app.id}")
                encryption_resp: EncryptionResponse | None = None
                if self.omu.app.type == AppType.REMOTE and meta["encryption"]:
                    decryptor = Decryptor.new()
                    encryptor = Encryptor.new(meta["encryption"]["rsa"])
                    if token:
                        token = encryptor.encrypt_string(token)
                    aes = AES.new()
                    encryption_resp = {
                        "kind": "v1",
                        "rsa": decryptor.to_request(),
                        "aes": aes.serialize(encryptor),
                    }
                    self.aes = aes
                await self.connection.send(
                    Packet(
                        PACKET_TYPES.CONNECT,
                        ConnectPacket(
                            app=self.omu.app,
                            protocol={"version": self.omu.version, "brand": BRAND},
                            encryption=encryption_resp,
                            token=token,
                        ),
                    ),
                    self._packet_mapper,
                )
                self.listen_task = asyncio.create_task(self._listen_task())
                await self._event.status.emit("connected")
                await self._event.connected.emit()
                await self._dispatch_tasks()

                await self.send(Packet(PACKET_TYPES.READY, None))
                await self.listen_task
            except Exception as e:
                await asyncio.sleep(1)
                if reconnect:
                    attempts += 1
                    if attempts > 10:
                        await asyncio.sleep(30)
                    elif exception:
                        logger.error("Failed to reconnect")
                    else:
                        logger.opt(exception=e).error(f"Failed to connect to {self.address.host}:{self.address.port}")
                    exception = e
                    continue
                else:
                    raise e
            finally:
                self.listen_task = None

            if not reconnect:
                break

            await asyncio.sleep(1)

    async def disconnect(self) -> None:
        if not self.connection:
            return
        if not self.connection.closed:
            await self.send(
                Packet(
                    PACKET_TYPES.DISCONNECT,
                    DisconnectPacket(DisconnectType.CLOSE, "Client disconnected"),
                )
            )
            await self.connection.close()
        self.connection = None
        await self._event.status.emit("disconnected")
        await self._event.disconnected.emit()

    async def close(self) -> None:
        await self.disconnect()

    async def send(self, packet: Packet) -> None:
        if not self.connection:
            raise RuntimeError("Not connected")
        if self.aes:
            serialized = self._packet_mapper.serialize(packet)
            packet = self.aes.encrypt(serialized)
        await self.connection.send(packet, self._packet_mapper)

    async def _listen_task(self):
        try:
            while self.connection:
                received = await self.connection.receive(self._packet_mapper)
                if received.is_err is True:
                    logger.error(received.err.message)
                    return
                asyncio.create_task(self.dispatch_packet(received.value))
        except CloseError as e:
            logger.opt(exception=e).error("Connection closed")
        finally:
            await self.disconnect()

    async def dispatch_packet(self, packet: Packet) -> None:
        if PACKET_TYPES.ENCRYPTED_PACKET.match(packet):
            if self.aes is None:
                raise RuntimeError("Received encrypted packet before encryption was established")
            decrypted = self.aes.decrypt(packet)
            packet = self._packet_mapper.deserialize(decrypted)
        await self._event.packet.emit(packet)
        packet_handler = self._packet_handlers.get(packet.type.id)
        if not packet_handler:
            return
        await packet_handler.event(packet.data)

    @property
    def event(self) -> NetworkEvents:
        return self._event

    def add_task(self, task: Coro[[], None]) -> None:
        if self.omu.ready:
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

from __future__ import annotations

import socket

import psutil
from aiohttp import web
from loguru import logger
from omu import App, Identifier
from omu.event_emitter import EventEmitter
from omu.helper import Coro
from omu.network.packet import PACKET_TYPES, PacketType
from omu.network.packet.packet_types import DisconnectType

from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.server import Server
from omuserver.session import Session, SessionType
from omuserver.session.aiohttp_connection import WebsocketsConnection


class Network:
    def __init__(
        self, server: Server, packet_dispatcher: ServerPacketDispatcher
    ) -> None:
        self._server = server
        self._packet_dispatcher = packet_dispatcher
        self._event = NetworkEvents()
        self._sessions: dict[Identifier, Session] = {}
        self._app = web.Application()
        self.add_websocket_route("/ws")
        self.register_packet(PACKET_TYPES.CONNECT, PACKET_TYPES.READY)
        self.add_packet_handler(PACKET_TYPES.READY, self._handle_ready)
        self.event.connected += self._packet_dispatcher.process_connection

    async def _handle_ready(self, session: Session, packet: None) -> None:
        await session.process_ready_tasks()
        if session.closed:
            return
        await session.send(PACKET_TYPES.READY, None)
        logger.info(f"Ready: {session.app.key()}")

    def register_packet(self, *packet_types: PacketType) -> None:
        self._packet_dispatcher.register(*packet_types)

    def add_packet_handler[T](
        self,
        packet_type: PacketType[T],
        coro: Coro[[Session, T], None],
    ) -> None:
        self._packet_dispatcher.add_packet_handler(packet_type, coro)

    def add_http_route(
        self, path: str, handle: Coro[[web.Request], web.StreamResponse]
    ) -> None:
        self._app.router.add_get(path, handle)

    async def _verify_origin(self, request: web.Request, session: Session) -> None:
        origin = request.headers.get("Origin")
        if origin is None:
            return
        namespace = session.app.id.namespace
        origin_namespace = Identifier.namespace_from_url(origin)
        if origin_namespace == namespace:
            return
        if origin_namespace in self._server.config.extra_trusted_origins:
            return
        trusted_origins = await self._server.server.trusted_origins.get()
        if origin_namespace in trusted_origins:
            return

        await session.disconnect(
            DisconnectType.INVALID_ORIGIN,
            f"Invalid origin: {origin_namespace} != {namespace}",
        )
        raise ValueError(f"Invalid origin: {origin_namespace} != {namespace}")

    def add_websocket_route(self, path: str) -> None:
        async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
            ws = web.WebSocketResponse()
            await ws.prepare(request)
            connection = WebsocketsConnection(ws)
            session = await Session.from_connection(
                self._server,
                self._packet_dispatcher.packet_mapper,
                connection,
            )
            if session.kind == SessionType.APP:
                await self._verify_origin(request, session)
            await self.process_session(session)
            return ws

        self._app.router.add_get(path, websocket_handler)

    async def process_session(self, session: Session) -> None:
        if self.is_connected(session.app):
            logger.warning(f"Session {session.app} already connected")
            old_session = self._sessions[session.app.id]
            await old_session.disconnect(
                DisconnectType.ANOTHER_CONNECTION,
                f"Another connection from {session.app}",
            )
        self._sessions[session.app.id] = session
        session.event.disconnected += self.handle_disconnection
        await self._event.connected.emit(session)
        await session.listen()

    def is_connected(self, app: App) -> bool:
        return app.id in self._sessions

    async def handle_disconnection(self, session: Session) -> None:
        if session.app.id not in self._sessions:
            return
        del self._sessions[session.app.id]
        await self._event.disconnected.emit(session)

    def is_port_free(self) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(
                    (
                        self._server.address.host or "127.0.0.1",
                        self._server.address.port,
                    )
                )
                return True
        except OSError:
            return False

    def get_process_by_port(self, port: int) -> psutil.Process | None:
        for connection in psutil.net_connections():
            if connection.laddr and connection.laddr.port == port:
                return psutil.Process(connection.pid)
        return None

    def ensure_port_availability(self):
        if not self.is_port_free():
            process = self.get_process_by_port(self._server.address.port)
            if process is None:
                raise OSError(f"Port {self._server.address.port} already in use")
            port = self._server.address.port
            name = process.name()
            pid = process.pid
            raise OSError(f"Port {port} already in use by {name} ({pid=})")

    async def start(self) -> None:
        self.ensure_port_availability()
        runner = web.AppRunner(self._app)
        await runner.setup()
        site = web.TCPSite(
            runner,
            host=self._server.address.host or "127.0.0.1",
            port=self._server.address.port,
        )
        await site.start()
        await self._event.start.emit()

    @property
    def event(self) -> NetworkEvents:
        return self._event


class NetworkEvents:
    def __init__(self) -> None:
        self.start = EventEmitter[[]]()
        self.connected = EventEmitter[Session]()
        self.disconnected = EventEmitter[Session]()

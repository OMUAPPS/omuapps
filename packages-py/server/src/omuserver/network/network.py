from __future__ import annotations

import socket
from typing import TYPE_CHECKING

from aiohttp import web
from loguru import logger
from omu import App, Identifier
from omu.address import get_lan_ip
from omu.app import AppType
from omu.event_emitter import EventEmitter
from omu.helper import Coro
from omu.network.packet import PACKET_TYPES, PacketType
from omu.network.packet.packet_types import DisconnectType

from omuserver.helper import find_processes_by_port
from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.session import Session
from omuserver.session.aiohttp_connection import WebsocketsConnection

if TYPE_CHECKING:
    from omuserver.server import Server


@web.middleware
async def cors_middleware(request, handler):
    response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


class Network:
    def __init__(self, server: Server, packet_dispatcher: ServerPacketDispatcher) -> None:
        self._server = server
        self._packet_dispatcher = packet_dispatcher
        self._event = NetworkEvents()
        self._sessions: dict[Identifier, Session] = {}
        self._app = web.Application(middlewares=[cors_middleware])
        self._runner: web.AppRunner | None = None
        self._app.router.add_get("/ws", self.websocket_handler)
        self.register_packet(PACKET_TYPES.CONNECT, PACKET_TYPES.READY, PACKET_TYPES.DISCONNECT)
        self.add_packet_handler(PACKET_TYPES.READY, self._handle_ready)
        self.add_packet_handler(PACKET_TYPES.DISCONNECT, self._handle_disconnection)
        self.event.connected += self._packet_dispatcher.process_connection
        self.self_ip = get_lan_ip()

    async def stop(self) -> None:
        if self._runner is None:
            raise ValueError("Server not started")
        await self._app.shutdown()
        await self._app.cleanup()

    async def _handle_ready(self, session: Session, packet: None) -> None:
        await session.process_ready_tasks()
        if session.closed:
            return
        await session.send(PACKET_TYPES.READY, None)
        parts = [session.app.key()]
        if session.app.version is not None:
            parts.append(f"v{session.app.version}")
        logger.info(f"Ready: {' '.join(parts)}")

    async def _handle_disconnection(self, session: Session, packet: DisconnectType) -> None:
        await session.disconnect(packet, "Disconnect packet received")

    def register_packet(self, *packet_types: PacketType) -> None:
        self._packet_dispatcher.register(*packet_types)

    def add_packet_handler[T](
        self,
        packet_type: PacketType[T],
        coro: Coro[[Session, T], None],
    ) -> None:
        self._packet_dispatcher.bind(packet_type, coro)

    def add_http_route(self, path: str, handle: Coro[[web.Request], web.StreamResponse]) -> None:
        self._app.router.add_get(path, handle)

    async def _verify_origin(self, request: web.Request, session: Session) -> None:
        if session.kind == AppType.REMOTE:
            return
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

    async def websocket_handler(self, request: web.Request) -> web.Response:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        connection = WebsocketsConnection(ws)
        session = await Session.from_connection(
            self._server,
            self._packet_dispatcher.packet_mapper,
            connection,
        )

        if request.remote not in {self.self_ip, "127.0.0.1"}:
            if session.kind != AppType.REMOTE:
                await session.disconnect(DisconnectType.INVALID_ORIGIN, "Not a remote app")
                logger.warning(f"Invalid remote app {session.app} from {request.remote}")
                return web.Response(status=403)

        if session.kind not in {AppType.DASHBOARD, AppType.PLUGIN}:
            await self._verify_origin(request, session)
        await self.process_session(session)
        return web.Response(status=101, headers={"Upgrade": "websocket"})

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
                s.bind((self._server.address.host, self._server.address.port))
                return True
        except OSError:
            return False

    def ensure_port_availability(self):
        if not self.is_port_free():
            found_processes = set(find_processes_by_port(self._server.address.port))
            if len(found_processes) == 0:
                raise OSError(f"Port {self._server.address.port} already in use by unknown process")
            is_system_idle_reserved = any(p.pid == 0 and p.name() == "System Idle Process" for p in found_processes)
            if is_system_idle_reserved:
                raise OSError(f"Port {self._server.address.port} already in use by System Idle Process")
            if len(found_processes) > 1:
                processes = " ".join(f"{p.name()} ({p.pid=})" for p in found_processes)
                raise OSError(f"Port {self._server.address.port} already in use by multiple processes: {processes}")
            process = found_processes.pop()
            port = self._server.address.port
            name = process.name()
            pid = process.pid
            parents = process.parents()
            msg = f"Port {port} already in use by {' -> '.join(f'{p.name()}({p.pid})' for p in parents)} -> {name} ({pid=})"
            raise OSError(msg)

    async def start(self) -> None:
        if self._runner is not None:
            raise ValueError("Server already started")
        self.ensure_port_availability()
        runner = web.AppRunner(self._app)
        self._runner = runner
        await runner.setup()
        site = web.TCPSite(
            runner,
            host="0.0.0.0",
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

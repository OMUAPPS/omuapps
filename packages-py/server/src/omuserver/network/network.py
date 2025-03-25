from __future__ import annotations

import socket
import urllib.parse
from typing import TYPE_CHECKING

from aiohttp import web
from loguru import logger
from omu import Identifier
from omu.address import get_lan_ip
from omu.app import AppType
from omu.errors import DisconnectReason, InvalidOrigin
from omu.event_emitter import EventEmitter
from omu.helper import Coro
from omu.network.packet import PACKET_TYPES, PacketType
from omu.network.packet.packet_types import DisconnectPacket, DisconnectType
from omu.result import Err, Ok, Result, is_err

from omuserver.helper import find_processes_by_port
from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.session import Session
from omuserver.session.aiohttp_connection import WebsocketsConnection

if TYPE_CHECKING:
    from omuserver.server import Server


@web.middleware
async def cors_middleware(request: web.Request, handler) -> web.Response:
    if request.method == "OPTIONS":
        return web.Response(
            status=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            },
        )
    response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
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
        self.local_ip = get_lan_ip()

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

    async def _handle_disconnection(self, session: Session, packet: DisconnectPacket) -> None:
        await session.disconnect(DisconnectType.CLOSE, packet.message)

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

    def _verify_remote_ip(self, request: web.Request, session: Session) -> Result[None, DisconnectReason]:
        if request.remote not in {self.local_ip, "127.0.0.1"}:
            logger.warning(f"Invalid remote ip {request.remote} for {session.app}")
            return Err(InvalidOrigin("Invalid remote ip (see logs)"))
        return Ok(None)

    async def _verify_origin(self, request: web.Request, session: Session) -> Result[None, DisconnectReason]:
        origin = request.headers.get("Origin")
        if origin is None:
            return Ok(None)
        origin_namespace = Identifier.namespace_from_url(origin)
        session_namespace = session.app.id.namespace
        if origin_namespace == session_namespace:
            return Ok(None)
        if origin_namespace in self._server.config.extra_trusted_origins:
            return Ok(None)
        trusted_origins = await self._server.server.trusted_origins.get()
        if origin_namespace in trusted_origins:
            return Ok(None)
        return Err(InvalidOrigin(f"Invalid origin: {origin_namespace} != {session_namespace}"))

    def _verify_frame_token(self, request: web.Request, session: Session) -> Result[None, DisconnectReason]:
        query = request.query
        if "frame_token" not in query:
            return Err(InvalidOrigin("Missing frame token"))
        frame_token = query["frame_token"]
        origin = request.headers.get("Origin")
        if origin is None:
            return Err(InvalidOrigin("Missing origin"))
        url = query.get("url")
        if url is None:
            return Err(InvalidOrigin("Missing url"))
        parsed_url = urllib.parse.unquote(url)
        verified = self._server.security.verify_frame_token(frame_token, parsed_url)
        if not verified:
            return Err(InvalidOrigin("Invalid frame token"))
        return Ok(None)

    async def _verify(self, session: Session, request: web.Request) -> Result[None, DisconnectReason]:
        if session.kind == AppType.REMOTE:
            return self._verify_frame_token(request, session)
        ip_verified = self._verify_remote_ip(request, session)
        if session.kind in {AppType.DASHBOARD, AppType.PLUGIN}:
            return ip_verified
        origin_verified = await self._verify_origin(request, session)
        return ip_verified and origin_verified

    async def websocket_handler(self, request: web.Request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        connection = WebsocketsConnection(ws)
        session = await Session.from_connection(
            self._server,
            self._packet_dispatcher.packet_mapper,
            connection,
        )

        verify_result = await self._verify(session, request)
        if is_err(verify_result):
            logger.warning(f"Verification failed for {session.app}: {verify_result.err}")
            await session.disconnect(verify_result.err.type, verify_result.err.message)
            return web.Response(status=403)

        await self.process_session(session)
        return ws

    async def process_session(self, session: Session) -> None:
        exist_session = self._sessions.get(session.app.id)
        if exist_session:
            logger.warning(f"Session {session.app} already connected")
            await exist_session.disconnect(
                DisconnectType.ANOTHER_CONNECTION,
                f"Another connection from {session.app}",
            )
        self._sessions[session.app.id] = session
        session.event.disconnected += self.handle_disconnection
        await self._event.connected.emit(session)
        await session.listen()

    async def handle_disconnection(self, session: Session) -> None:
        if session.app.id not in self._sessions:
            return
        del self._sessions[session.app.id]
        await self._event.disconnected.emit(session)

    def is_port_free(self) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", self._server.address.port))
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", self._server.address.port))
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((self._server.address.host, self._server.address.port))
            return True
        except OSError:
            return False

    def ensure_port_availability(self):
        if self.is_port_free():
            return
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

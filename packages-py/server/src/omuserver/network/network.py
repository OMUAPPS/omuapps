from __future__ import annotations

import signal
import socket
import sys
import tkinter
from pathlib import Path
from tkinter import messagebox
from typing import TYPE_CHECKING

import psutil
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
from psutil import Process
from yarl import URL

from omuserver.helper import find_processes_by_executable, find_processes_by_port, get_parent_pids
from omuserver.network.aiohttp_connection import WebsocketsConnection
from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.session import Session

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
        self.server = server
        self._packet_dispatcher = packet_dispatcher
        self._app = web.Application(middlewares=[cors_middleware])
        self._runner: web.AppRunner | None = None
        self._app.router.add_get("/ws", self.websocket_handler)
        self.register_packet(
            PACKET_TYPES.CONNECT,
            PACKET_TYPES.READY,
            PACKET_TYPES.DISCONNECT,
            PACKET_TYPES.ENCRYPTED_PACKET,
        )
        self.add_packet_handler(PACKET_TYPES.READY, self._handle_ready)
        self.add_packet_handler(PACKET_TYPES.DISCONNECT, self._handle_disconnection)
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

    def route_get(self, path: str, handle: Coro[[web.Request], web.StreamResponse]) -> None:
        self._app.router.add_get(path, handle)

    def route_post(self, path: str, handle: Coro[[web.Request], web.StreamResponse]) -> None:
        self._app.router.add_post(path, handle)

    def _verify_remote_ip(self, request: web.Request, session: Session) -> Result[None, DisconnectReason]:
        if request.remote not in {self.local_ip, "127.0.0.1"}:
            logger.warning(f"Invalid remote ip {request.remote} for {session.app}")
            return Err(InvalidOrigin("Invalid remote ip (see logs)"))
        return Ok(None)

    def get_mapped_host(self, host: str) -> str:
        hosts = {
            **self.server.server.trusted_hosts.get(),
            **self.server.config.extra_trusted_hosts,
        }
        return hosts.get(host) or host

    def get_mapped_url(self, url: URL) -> URL:
        parsed = URL(url)
        authority = self.get_mapped_host(parsed.authority)
        return URL.build(
            scheme=url.scheme,
            authority=authority,
            path=url.path,
            query=url.query,
            query_string=url.query_string,
            fragment=url.fragment,
        )

    async def _verify_origin(self, request: web.Request, session: Session) -> Result[None, DisconnectReason]:
        origin = request.headers.get("Origin")
        if origin is None:
            return Ok(None)
        origin_url = self.get_mapped_url(URL(origin))
        origin_namespace = Identifier.namespace_from_url(origin_url)
        session_namespace = session.app.id.namespace
        if origin_namespace == session_namespace:
            return Ok(None)
        return Err(InvalidOrigin(f"Invalid origin: {origin_namespace} != {session_namespace}"))

    async def _verify(self, session: Session, request: web.Request) -> Result[None, DisconnectReason]:
        if session.kind == AppType.REMOTE:
            return self.server.security.verify_frame_token(request)
        ip_verified = self._verify_remote_ip(request, session)
        if session.kind in {AppType.DASHBOARD, AppType.PLUGIN}:
            return ip_verified
        origin_verified = await self._verify_origin(request, session)
        return ip_verified and origin_verified

    async def websocket_handler(self, request: web.Request) -> web.StreamResponse:
        ws = web.WebSocketResponse(max_msg_size=0)
        await ws.prepare(request)
        connection = WebsocketsConnection(ws)
        session_result = await Session.from_connection(
            self.server,
            self._packet_dispatcher.packet_mapper,
            connection,
        )
        if session_result.is_err is True:
            logger.warning(f"Connection failed: {session_result.err}")
            return web.Response(status=403)
        session, new_token = session_result.value

        verify_result = await self._verify(session, request)
        if is_err(verify_result):
            logger.warning(f"Verification failed for {session.app}: {verify_result.err}")
            await session.disconnect(verify_result.err.type, verify_result.err.message)
            return web.Response(status=403)

        if session.kind not in {AppType.PLUGIN, AppType.DASHBOARD}:
            await session.send(PACKET_TYPES.TOKEN, new_token)

        await self.server.sessions.process_new(session)
        return ws

    def is_port_free(self) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", self.server.address.port))
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", self.server.address.port))
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((self.server.address.host, self.server.address.port))
            return True
        except OSError:
            return False

    def _is_server_process(self, process: Process) -> bool:
        args = process.cmdline()
        if len(args) >= 2 and "python.debugpy" in args[1]:
            return False
        return True

    def ensure_port_availability(self) -> Result[None, tuple[str, list[Process]]]:
        if self.is_port_free():
            return Ok(None)
        executable = Path(sys.executable)
        port = self.server.address.port
        found_processes: set[Process] = set()
        found_processes.update(find_processes_by_port(port))
        logger.info(f"No processes found using port {port}")
        found_processes.update(find_processes_by_executable(executable))
        ignore_pids = list(get_parent_pids())
        found_processes = {p for p in found_processes if (p.pid not in ignore_pids) and (self._is_server_process(p))}
        if len(found_processes) == 0:
            return Err((f"Port {port} already in use by unknown process", []))
        if len(found_processes) > 1:
            processes = " ".join(f"{p.name()} ({p.pid=})" for p in found_processes)
            return Err(
                (
                    f"Port {port} already in use by multiple processes: {processes}",
                    list(found_processes),
                )
            )
        process = found_processes.pop()
        port = self.server.address.port
        name = process.name()
        pid = process.pid
        parents = process.parents()
        msg = f"Port {port} already in use by {' -> '.join(f'{p.name()}({p.pid})' for p in parents)} -> {name} ({pid=})"
        return Err((msg, list(found_processes)))

    def terminate_process_due_to_port(self, processes: list[Process]):
        root = tkinter.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        def wait_for_process_to_end():
            if any(process.is_running() for process in processes):
                root.after(200, wait_for_process_to_end)
            else:
                root.destroy()

        root.after(200, wait_for_process_to_end)

        process_names = ", ".join(process.name() for process in processes)
        message = f"OMUAPPSの使用するためには以下のアプリを閉じる必要があります\n{process_names}"
        res = messagebox.Message(
            root,
            title="OMUAPPS API",
            message=message,
            icon=messagebox.WARNING,
            type=messagebox.YESNO,
        ).show()
        if not res or res == messagebox.YES:
            ignore_pids = list(get_parent_pids())
            for process in processes:
                try:
                    if process.pid in ignore_pids:
                        continue
                    logger.info(f"Killing process {process.pid} ({process.name()}) running at {process.cwd()}")
                    if not process.is_running():
                        continue
                    process.send_signal(signal.SIGTERM)
                except psutil.NoSuchProcess:
                    logger.warning(f"Process {process.pid} not found")
                except psutil.AccessDenied:
                    logger.warning(f"Access denied to process {process.pid}")
                except Exception:
                    logger.exception(f"Failed to kill process {process.pid}")
        elif res == messagebox.NO:
            return Err("User cancelled shutdown")

    def notify_system_idle_process_conflict(self):
        root = tkinter.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        messagebox.Message(
            root,
            title="OMUAPPS API",
            message="起動に失敗しました再度お試しください。これにはPCの再起動が必要な場合があります",
            icon=messagebox.WARNING,
            type=messagebox.OK,
        ).show()

    async def start(self) -> None:
        if self._runner is not None:
            raise ValueError("Server already started")
        match self.ensure_port_availability():
            case Err((msg, processes)):
                logger.error(msg)
                if len(processes) == 0:
                    self.notify_system_idle_process_conflict()
                self.terminate_process_due_to_port(processes)

        runner = web.AppRunner(self._app)
        self._runner = runner
        await runner.setup()
        site = web.TCPSite(
            runner,
            host="0.0.0.0",
            port=self.server.address.port,
        )
        await site.start()


class NetworkEvents:
    def __init__(self) -> None:
        self.connected = EventEmitter[Session]()
        self.disconnected = EventEmitter[Session]()

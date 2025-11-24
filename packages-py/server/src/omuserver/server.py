from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from urllib.parse import urlencode

import aiohttp
from aiohttp import web
from loguru import logger
from omu import Identifier
from omu.event_emitter import EventEmitter
from omu.helper import asyncio_error_logger
from omu.network.packet.packet_types import DisconnectType
from omu.result import Err, Ok
from yarl import URL

from omuserver.api.asset import AssetExtension
from omuserver.api.dashboard import DashboardExtension
from omuserver.api.endpoint import EndpointExtension
from omuserver.api.http import HttpExtension
from omuserver.api.i18n import I18nExtension
from omuserver.api.logger import LoggerExtension
from omuserver.api.permission import PermissionExtension
from omuserver.api.plugin import PluginExtension
from omuserver.api.registry import RegistryExtension
from omuserver.api.server import ServerExtension
from omuserver.api.session import SessionExtension
from omuserver.api.signal import SignalExtension
from omuserver.api.table import TableExtension
from omuserver.config import Config
from omuserver.consts import USER_AGENT_HEADERS
from omuserver.dependency import AppIndexRegistry, InstallRequest
from omuserver.network import Network
from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.security import PermissionManager
from omuserver.version import VERSION

RESTART_EXIT_CODE = 100
FRAME_TYPE_KEY = "omuapps-frame"


class Server:
    def __init__(
        self,
        config: Config,
        loop: asyncio.AbstractEventLoop | None = None,
    ) -> None:
        self.config = config
        self._loop = self._set_loop(loop or asyncio.new_event_loop())
        self.address = config.address
        self.event = ServerEvents()
        self.directories = config.directories
        self.directories.mkdir()
        self.packets = ServerPacketDispatcher()
        self.network = Network(self, self.packets)
        self.network.route_get("/", self._handle_index)
        self.network.route_get("/version", self._handle_version)
        self.network.route_get("/frame", self._handle_frame)
        self.network.route_get("/index/install", self._handle_get_index_install)
        self.network.route_post("/api/index/install", self._handle_post_index_install)
        self.security = PermissionManager.load(self)
        self.running = False
        self.endpoints = EndpointExtension(self)
        self.permissions = PermissionExtension(self)
        self.tables = TableExtension(self)
        self.sessions = SessionExtension(self)
        self.registries = RegistryExtension(self)
        self.dashboard = DashboardExtension(self)
        self.server = ServerExtension(self)
        self.http = HttpExtension(self)
        self.signals = SignalExtension(self)
        self.plugins = PluginExtension(self)
        self.assets = AssetExtension(self)
        self.i18n = I18nExtension(self)
        self.logger = LoggerExtension(self)
        self.client = aiohttp.ClientSession(
            loop=self.loop,
            headers=USER_AGENT_HEADERS,
            timeout=aiohttp.ClientTimeout(total=10),
        )
        self.last_prompt_timestamp: dict[str, float] = {}

    def _set_loop(self, loop: asyncio.AbstractEventLoop) -> asyncio.AbstractEventLoop:
        loop = asyncio.new_event_loop()
        loop.set_exception_handler(asyncio_error_logger)
        return loop

    async def _handle_index(self, request: web.Request) -> web.StreamResponse:
        return web.FileResponse(self.directories.index)

    async def _handle_version(self, request: web.Request) -> web.Response:
        return web.json_response({"version": VERSION})

    async def _handle_frame(self, request: web.Request) -> web.StreamResponse:
        url = request.query.get("url")
        if not url:
            return web.Response(status=400)
        url = URL(url).human_repr()
        content = self.directories.frame.read_text(encoding="utf-8")
        frame_token = self.security.generate_frame_token(url)
        config = {
            "frame_token": frame_token,
            "url": url,
            "ws_url": URL.build(
                scheme="ws",
                host=self.address.host,
                port=self.address.port,
                path="/ws",
                query_string=urlencode({"frame_token": frame_token, "url": url}),
            ).human_repr(),
            "type_key": FRAME_TYPE_KEY,
        }
        content = content.replace("%CONFIG%", json.dumps(config))
        return web.Response(text=content, content_type="text/html")

    async def _handle_get_index_install(self, request: web.Request) -> web.StreamResponse:
        # Check host
        if request.remote:
            remote_url = URL(request.remote)
            if remote_url.host not in {"localhost", "127.0.0.1", self.address.host}:
                return self._error_response("Invalid Host")

        raw_index_url = request.query.get("index_url")
        if not raw_index_url:
            return self._error_response("inedx_url not provided")
        raw_index_url = URL(raw_index_url)
        match await AppIndexRegistry.try_fetch(raw_index_url):
            case Err(err):
                return self._error_response(f"Failed to fetch index: {err}")
            case Ok(index):
                ...
        mapped_index_url = self.network.get_mapped_url(raw_index_url)
        provided_index_namespace = Identifier.namespace_from_url(mapped_index_url)

        if index.id.namespace != provided_index_namespace:
            return self._error_response("Namespace mismatch")

        if not index.id.is_namepath_equal(index.id):
            return self._error_response("Trust issue")

        content = self.directories.index_install.read_text(encoding="utf-8")
        config = {
            "id": index.id.key(),
            "meta": index.meta,
            "url": str(raw_index_url),
        }
        server_index = self.server.index.get()
        already_installed = index.id.key() in server_index["indexes"]
        if already_installed:
            config["installed"] = True
        content = content.replace("%CONFIG%", json.dumps(config))
        return web.Response(text=content, content_type="text/html")

    def _error_response(self, message: str, status=400) -> web.StreamResponse:
        return web.json_response(
            {"type": "error", "message": message},
            status=status,
            reason=message,
        )

    async def _handle_post_index_install(self, request: web.Request) -> web.StreamResponse:
        # Check origin
        origin = request.headers.get("Origin")
        if origin is None:
            return self._error_response("Missing Origin header")
        origin_url = URL(origin)
        if origin_url.host not in {"localhost", "127.0.0.1", self.address.host}:
            return self._error_response("Invalid Origin Host")
        if origin_url.port not in {self.address.port}:
            return self._error_response("Invalid Origin Port")
        # Check host
        if request.remote:
            remote_url = URL(request.remote)
            if remote_url.host not in {"localhost", "127.0.0.1", self.address.host}:
                return self._error_response("Invalid Host")

        install_request: InstallRequest = await request.json()
        raw_index_url = URL(install_request["index"])
        key = Identifier.from_key(install_request["id"]).namespace
        elapsed = time.time() - self.last_prompt_timestamp.get(key, 0)
        remaining = 5 - elapsed
        if remaining > 0:
            return self._error_response(
                f"An installation is already in progress. You can try again in {remaining:.1f} seconds."
            )
        self.last_prompt_timestamp[key] = time.time()
        mapped_index_url = self.network.get_mapped_url(raw_index_url)
        provided_index_namespace = Identifier.namespace_from_url(mapped_index_url)

        match await AppIndexRegistry.try_fetch(raw_index_url):
            case Err(err):
                return self._error_response(f"Failed to fetch index: {err}")
            case Ok(index):
                ...

        if index.id.namespace != provided_index_namespace:
            return self._error_response("Namespace mismatch")

        if not index.id.is_namepath_equal(index.id):
            return self._error_response("Trust issue")

        accepted = await self.dashboard.notify_index_install(mapped_index_url, index.meta)

        if not accepted:
            return self._error_response(
                "Installation denied by the user.",
                status=403,
            )

        server_index = self.server.index.get()
        server_index["indexes"][index.id.key()] = {
            "added_at": datetime.now().isoformat(),
            "meta": index.meta,
            "url": str(raw_index_url),
        }
        self.server.index.set(server_index)

        return web.json_response(
            {"type": "installed"},
            status=200,
        )

    def run(self) -> None:
        async def _run():
            await self.start()

        if self._loop is None:
            asyncio.run(_run())
        else:
            self._loop.create_task(_run())
            self._loop.run_forever()

    async def start(self) -> None:
        self.running = True
        try:
            await self.network.start()
            logger.info(f"Listening on {self.address.host}:{self.address.port}")
            await self.event.start()
        except Exception as e:
            logger.opt(exception=e).error("Failed to start server")
            await self.stop()
            self.loop.stop()
            raise e

    async def stop(self) -> None:
        logger.info("Stopping server")
        self.running = False
        await self.event.stop()
        await self.network.stop()

    async def restart(self) -> None:
        for session in list(self.sessions.iter()):
            if session.closed:
                continue
            await session.disconnect(DisconnectType.SERVER_RESTART, "Server is restarting")
        await self.stop()
        child = subprocess.Popen(
            args=[sys.executable, "-m", "omuserver", *sys.argv[1:]],
            cwd=os.getcwd(),
        )
        logger.info(f"Restarting server with PID {child.pid}")
        os._exit(RESTART_EXIT_CODE)

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        return self._loop


class ServerEvents:
    def __init__(self) -> None:
        self.start = EventEmitter[[]]()
        self.stop = EventEmitter[[]]()

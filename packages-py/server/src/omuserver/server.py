from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import urllib
import urllib.parse
from dataclasses import dataclass
from datetime import datetime
from typing import TypedDict
from urllib.parse import urlencode

import aiohttp
from aiohttp import web
from loguru import logger
from omu import Identifier
from omu.app import App, AppJson
from omu.event_emitter import EventEmitter
from omu.helper import asyncio_error_logger
from omu.network.packet.packet_types import DisconnectType
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
from omuserver.helper import safe_path_join
from omuserver.network import Network
from omuserver.network.packet_dispatcher import ServerPacketDispatcher
from omuserver.security import PermissionManager
from omuserver.version import VERSION

USER_AGENT_HEADERS = {"User-Agent": json.dumps(["omu", {"name": "omuserver", "version": VERSION}])}
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
        self.network.route_get("/proxy", self._handle_proxy)
        self.network.route_get("/asset", self._handle_assets)
        self.network.route_post("/index_install", self._handle_index_install)
        self.security = PermissionManager.load(self)
        self.running = False
        self.endpoints = EndpointExtension(self)
        self.permissions = PermissionExtension(self)
        self.tables = TableExtension(self)
        self.sessions = SessionExtension(self)
        self.http = HttpExtension(self)
        self.registries = RegistryExtension(self)
        self.dashboard = DashboardExtension(self)
        self.server = ServerExtension(self)
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

    async def _handle_proxy(self, request: web.Request) -> web.StreamResponse:
        url = request.query.get("url")
        no_cache = bool(request.query.get("no_cache"))
        if not url:
            return web.Response(status=400)
        try:
            async with self.client.get(
                url,
            ) as resp:
                headers = {
                    "Cache-Control": "no-cache" if no_cache else "max-age=3600",
                    "Content-Type": resp.content_type,
                    "Access-Control-Allow-Origin": "*",
                }
                response = web.StreamResponse(status=resp.status, headers=headers)
                await response.prepare(request)
                async for chunk in resp.content.iter_any():
                    await response.write(chunk)
                return response
        except TimeoutError:
            return web.Response(status=504)
        except aiohttp.ClientConnectionResetError:
            return web.Response(status=502)
        except aiohttp.ClientResponseError as e:
            return web.Response(status=e.status, text=e.message)
        except Exception:
            logger.error("Failed to proxy request")
            return web.Response(status=500)

    async def _handle_assets(self, request: web.Request) -> web.StreamResponse:
        id = request.query.get("id")
        if not id:
            return web.Response(status=400)
        identifier = Identifier.from_key(id)
        path = identifier.get_sanitized_path()
        try:
            path = safe_path_join(self.directories.assets, path)

            if not path.exists():
                return web.Response(status=404)
            return web.FileResponse(path)
        except Exception as e:
            logger.error(e)
            return web.Response(status=500)

    async def _handle_index_install(self, request: web.Request) -> web.StreamResponse:
        install_request: InstallRequest = await request.json()
        index_url = install_request["index"]
        parsed_url = urllib.parse.urlparse(index_url)
        is_host_trusted = parsed_url.netloc in self.config.extra_trusted_origins
        needs_check = not is_host_trusted
        provided_index_namespace = Identifier.namespace_from_url(index_url)

        try:
            resp = await self.client.get(
                index_url,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
        except aiohttp.ClientError as e:
            return web.json_response(
                {"type": "error", "message": f"Failed to fetch index: {str(e)}"},
                status=400,
                reason=f"Failed to fetch index: {str(e)}",
            )

        try:
            index = AppIndexRegistry.from_json(await resp.json())
        except Exception as e:
            return web.json_response(
                {"type": "error", "message": f"Invalid app index: {str(e)}"},
                status=400,
                reason=f"Invalid app index: {str(e)}",
            )

        index_id = index.id
        if needs_check and index_id.namespace != provided_index_namespace:
            return web.json_response(
                {"type": "error", "message": "Namespace mismatch"},
                status=400,
                reason="Provided index ID does not match the namespace ID in the index URL.",
            )

        if needs_check and not index_id.is_namepath_equal(index.id):
            return web.json_response(
                {"type": "error", "message": "Trust issue"},
                status=400,
                reason="Provided index ID does not match the namespace ID in the index URL.",
            )

        accepted = await self.dashboard.notify_index_install(index_url)

        if not accepted:
            return web.json_response(
                {"type": "error", "message": "Installation denied by the user."},
                status=403,
                reason="Installation denied by the user.",
            )

        server_index = self.server.index.get()
        server_index["indexes"][index.id.key()] = {
            "added_at": datetime.now().isoformat(),
            "url": index_url,
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


class InstallRequest(TypedDict):
    index: str
    id: str


class AppIndexRegistryJSON(TypedDict):
    id: str
    apps: dict[str, AppJson]


@dataclass(frozen=True, slots=True)
class AppIndexRegistry:
    id: Identifier
    apps: dict[Identifier, App]

    @staticmethod
    def from_json(json: AppIndexRegistryJSON) -> AppIndexRegistry:
        id = Identifier.from_key(json["id"])
        apps: dict[Identifier, App] = {}
        for id_str, app_json in json["apps"].items():
            id = Identifier.from_key(id_str)
            app = App.from_json(app_json)
            if not id.is_namepath_equal(app.id):
                raise AssertionError(f"App ID does not match the ID in the index. {app.id} != {id}")
            apps[id] = app
        return AppIndexRegistry(
            id=id,
            apps=apps,
        )

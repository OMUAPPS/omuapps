from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from urllib.parse import urlencode

import aiohttp
from aiohttp import web
from loguru import logger
from omu import Identifier
from omu.event_emitter import EventEmitter
from omu.helper import asyncio_error_logger
from omu.network.packet.packet_types import ServerMetaJson
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
        self.meta: ServerMetaJson = {
            "hash": config.address.hash,
            "protocol": {
                "version": VERSION,
            },
        }
        self._loop = self._set_loop(loop or asyncio.new_event_loop())
        self.address = config.address
        self.event = ServerEvents()
        self.directories = config.directories
        self.directories.mkdir()
        self.packets = ServerPacketDispatcher()
        self.network = Network(self, self.packets)
        self.network.event.start += self._handle_network_start
        self.network.add_http_route("/", self._handle_index)
        self.network.add_http_route("/version", self._handle_version)
        self.network.add_http_route("/frame", self._handle_frame)
        self.network.add_http_route("/proxy", self._handle_proxy)
        self.network.add_http_route("/asset", self._handle_assets)
        self.security = PermissionManager(self)
        self.running = False
        self.endpoints = EndpointExtension(self)
        self.permissions = PermissionExtension(self)
        self.tables = TableExtension(self)
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

    def run(self) -> None:
        async def _run():
            await self.start()

        if self._loop is None:
            asyncio.run(_run())
        else:
            self._loop.create_task(_run())
            self._loop.run_forever()

    async def _handle_network_start(self) -> None:
        logger.info(f"Listening on {self.address.host}:{self.address.port}")
        try:
            await self.event.start()
        except Exception as e:
            await self.stop()
            self.loop.stop()
            raise e

    async def start(self) -> None:
        self.running = True
        try:
            await self.network.start()
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

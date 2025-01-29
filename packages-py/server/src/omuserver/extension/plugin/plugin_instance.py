from __future__ import annotations

import asyncio
import importlib
import importlib.metadata
import importlib.util
import io
import os
import sys
import threading
import time
from dataclasses import dataclass
from multiprocessing import Process
from types import ModuleType
from typing import TYPE_CHECKING

import psutil
from loguru import logger
from omu.address import Address
from omu.app import App, AppType
from omu.client import Client
from omu.helper import asyncio_error_logger
from omu.network.websocket_connection import WebsocketsConnection
from omu.plugin import InstallContext, Plugin
from omu.token import TokenProvider

from omuserver.session import Session

from .plugin_connection import PluginConnection
from .plugin_session_connection import PluginSessionConnection

if TYPE_CHECKING:
    from omuserver.server import Server


class PluginTokenProvider(TokenProvider):
    def __init__(self, token: str):
        self._token = token

    def get(self, server_address: Address, app: App) -> str | None:
        return self._token

    def store(self, server_address: Address, app: App, token: str) -> None:
        raise NotImplementedError


def deep_reload(module: ModuleType) -> None:
    to_reload: list[ModuleType] = [module]
    module_key = module.__name__ + "."
    for key, module in sys.modules.items():
        if key.startswith(module_key):
            to_reload.append(module)
    for module in to_reload:
        try:
            importlib.reload(module)
        except Exception as e:
            logger.opt(exception=e).error(f"Error reloading module {module}")


@dataclass(slots=True)
class PluginInstance:
    plugin: Plugin
    entry_point: importlib.metadata.EntryPoint
    module: ModuleType
    process: Process | None = None
    client: Client | None = None

    @classmethod
    def try_load(
        cls,
        entry_point: importlib.metadata.EntryPoint,
    ) -> PluginInstance | None:
        package = entry_point.dist
        stage = "loading"
        try:
            plugin = entry_point.load()
            stage = "validating"
            if not isinstance(plugin, Plugin):
                raise ValueError(f"Invalid plugin: {plugin} is not a Plugin")
            stage = "importing"
            module = importlib.import_module(entry_point.module)
            return cls(
                plugin=plugin,
                entry_point=entry_point,
                module=module,
            )
        except Exception as e:
            logger.opt(exception=e).error(f"Error while {stage} plugin {entry_point.name} from {package}")
            return None

    async def notify_install(self, ctx: InstallContext):
        if self.plugin.on_install is not None:
            arg_count = self.plugin.on_install.__code__.co_argcount
            if arg_count == 1:
                await self.plugin.on_install(ctx)
            elif arg_count == 0:
                await self.plugin.on_install()  # type: ignore

    async def notify_uninstall(self, ctx: InstallContext):
        if self.plugin.on_uninstall is not None:
            arg_count = self.plugin.on_uninstall.__code__.co_argcount
            if arg_count == 1:
                await self.plugin.on_uninstall(ctx)
            elif arg_count == 0:
                await self.plugin.on_uninstall()  # type: ignore

    async def notify_update(self, ctx: InstallContext):
        if self.plugin.on_update is not None:
            arg_count = self.plugin.on_update.__code__.co_argcount
            if arg_count == 1:
                await self.plugin.on_update(ctx)
            elif arg_count == 0:
                await self.plugin.on_update()  # type: ignore

    async def reload(self):
        deep_reload(self.module)
        new_plugin = self.entry_point.load()
        if not isinstance(new_plugin, Plugin):
            raise ValueError(f"Invalid plugin: {new_plugin} is not a Plugin")
        self.plugin = new_plugin

    async def terminate(self, server: Server):
        if self.process is not None:
            self.process.terminate()
            self.process.join()
            self.process = None
        if self.client is not None:
            await self.client.stop()
            self.client = None
        if self.plugin.on_stop is not None:
            await self.plugin.on_stop(server)

    async def start(self, server: Server):
        stage = "invoking on_start"
        try:
            if self.plugin.on_start is not None:
                await self.plugin.on_start(server)
            stage = "generating token"
            token = server.security.generate_plugin_token()
            if self.plugin.isolated:
                stage = "starting isolated"
                self._start_isolated(server, token)
            else:
                stage = "starting internally"
                await self._start_internally(server, token)
        except Exception as e:
            logger.opt(exception=e).error(f"Error while {stage} plugin {self.entry_point.name}")

    async def _start_internally(self, server: Server, token: str):
        if self.client:
            raise ValueError(f'Plugin "{self.plugin}" already started')
        if self.plugin.get_client is not None:
            connection = PluginConnection()
            self.client = self.plugin.get_client()
            if self.client.app.type != AppType.PLUGIN:
                raise ValueError(f"Invalid plugin: {self.client.app} is not a plugin")
            self.client.network.set_connection(connection)
            self.client.network.set_token_provider(PluginTokenProvider(token))
            self.client.set_loop(server.loop)
            server.loop.create_task(self.client.start(reconnect=False))
            session_connection = PluginSessionConnection(connection)
            session = await Session.from_connection(
                server,
                server.packets.packet_mapper,
                session_connection,
            )
            server.loop.create_task(server.network.process_session(session))

    def _start_isolated(self, server, token):
        pid = os.getpid()
        if self.process:
            raise ValueError(f'Plugin "{self.plugin}" already started')
        process = Process(
            target=run_plugin_isolated,
            args=(
                self.plugin,
                server.address,
                token,
                pid,
            ),
            name=f"Plugin {self.entry_point.value}",
            daemon=True,
        )
        self.process = process
        process.start()


def setup_logging(app: App) -> None:
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    if isinstance(sys.stderr, io.TextIOWrapper):
        sys.stderr.reconfigure(encoding="utf-8")
    logger.add(
        f"logs/{app.id.get_sanitized_path()}/{{time}}.log",
        colorize=False,
        format=("{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | " "{name}:{function}:{line} - {message}"),
        retention="7 days",
        compression="zip",
    )


def run_plugin_isolated(
    plugin: Plugin,
    address: Address,
    token: str,
    pid: int,
) -> None:
    def _watch_parent_process():
        while True:
            if not psutil.pid_exists(pid):
                logger.info(f"Parent process {pid} is dead, stopping plugin")
                exit(0)
            time.sleep(1)

    threading.Thread(target=_watch_parent_process, daemon=True).start()

    try:
        if plugin.get_client is None:
            raise ValueError(f"Invalid plugin: {plugin} has no client")
        client = plugin.get_client()
        if client.app.type != AppType.PLUGIN:
            raise ValueError(f"Invalid plugin: {client.app} is not a plugin")
        setup_logging(client.app)
        logger.info(f"Starting plugin {client.app.id}")
        connection = WebsocketsConnection(client, address)
        client.network.set_connection(connection)
        client.network.set_token_provider(PluginTokenProvider(token))
        loop = asyncio.new_event_loop()
        loop.set_exception_handler(asyncio_error_logger)

        def stop_plugin():
            logger.info(f"Stopping plugin {client.app.id}")
            loop.stop()
            exit(0)

        client.network.event.disconnected += stop_plugin
        client.run(loop=loop, reconnect=False)
        loop.run_forever()
    except Exception as e:
        logger.opt(exception=e).error("Error running plugin")

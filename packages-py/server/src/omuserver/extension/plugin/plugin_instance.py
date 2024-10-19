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

import psutil
from loguru import logger
from omu.address import Address
from omu.app import App, AppType
from omu.helper import asyncio_error_logger
from omu.network.websocket_connection import WebsocketsConnection
from omu.plugin import InstallContext, Plugin
from omu.token import TokenProvider

from omuserver.server import Server
from omuserver.session import Session

from .plugin_connection import PluginConnection
from .plugin_session_connection import PluginSessionConnection


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

    @classmethod
    def from_entry_point(
        cls,
        entry_point: importlib.metadata.EntryPoint,
    ) -> PluginInstance:
        plugin = entry_point.load()
        if not isinstance(plugin, Plugin):
            raise ValueError(f"Invalid plugin: {plugin} is not a Plugin")
        module = importlib.import_module(entry_point.module)
        return cls(
            plugin=plugin,
            entry_point=entry_point,
            module=module,
        )

    async def notify_install(self, ctx: InstallContext):
        if self.plugin.on_install is not None:
            await self.plugin.on_install(ctx)

    async def notify_uninstall(self, ctx: InstallContext):
        if self.plugin.on_uninstall is not None:
            await self.plugin.on_uninstall(ctx)

    async def notify_update(self, ctx: InstallContext):
        if self.plugin.on_update is not None:
            await self.plugin.on_update(ctx)

    async def reload(self):
        deep_reload(self.module)
        new_plugin = self.entry_point.load()
        if not isinstance(new_plugin, Plugin):
            raise ValueError(f"Invalid plugin: {new_plugin} is not a Plugin")
        self.plugin = new_plugin

    async def start(self, server: Server):
        token = server.permission_manager.generate_plugin_token()
        pid = os.getpid()
        if self.plugin.isolated:
            process = Process(
                target=run_plugin_isolated,
                args=(
                    self.plugin,
                    server.address,
                    token,
                    pid,
                ),
                daemon=True,
            )
            process.start()
        else:
            if self.plugin.get_client is not None:
                connection = PluginConnection()
                plugin_client = self.plugin.get_client()
                if plugin_client.app.type != AppType.PLUGIN:
                    raise ValueError(
                        f"Invalid plugin: {plugin_client.app} is not a plugin"
                    )
                plugin_client.network.set_connection(connection)
                plugin_client.network.set_token_provider(PluginTokenProvider(token))
                server.loop.create_task(plugin_client.start())
                session_connection = PluginSessionConnection(connection)
                session = await Session.from_connection(
                    server,
                    server.packet_dispatcher.packet_mapper,
                    session_connection,
                )
                server.loop.create_task(server.network.process_session(session))


def setup_logging(app: App) -> None:
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    if isinstance(sys.stderr, io.TextIOWrapper):
        sys.stderr.reconfigure(encoding="utf-8")
    logger.add(
        f"logs/{app.id.get_sanitized_path()}/{{time}}.log",
        colorize=False,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
            "{name}:{function}:{line} - {message}"
        ),
        retention="7 days",
        compression="zip",
    )


def run_plugin_isolated(
    plugin: Plugin,
    address: Address,
    token: str,
    pid: int,
) -> None:
    def _wait_for_parent():
        while True:
            if not psutil.pid_exists(pid):
                logger.info(f"Parent process {pid} is dead, stopping plugin")
                exit(0)
            time.sleep(1)

    threading.Thread(target=_wait_for_parent, daemon=True).start()

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
        client.run(loop=loop)
        loop.run_forever()
    except Exception as e:
        logger.opt(exception=e).error("Error running plugin")

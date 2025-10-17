from __future__ import annotations

import asyncio
import importlib
import importlib.metadata
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
from omu.helper import asyncio_error_logger
from omu.network.websocket_connection import WebsocketsTransport
from omu.omu import Omu
from omu.plugin import InstallContext, Plugin, StartContext, StopContext
from omu.result import Err, Ok, Result
from omu.token import TokenProvider

from omuserver.helper import setup_logger
from omuserver.session import Session

from .loader import PluginEntry
from .session_connection import PluginSessionConnection
from .transport import PluginConnection

if TYPE_CHECKING:
    from omuserver.server import Server


class PluginTokenProvider(TokenProvider):
    def __init__(self, token: str):
        self._token = token

    def get(self, address: Address, app: App) -> str | None:
        return self._token

    def store(self, address: Address, app: App, token: str) -> None:
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
    entry: PluginEntry
    module: ModuleType
    process: Process | None = None
    omu: Omu | None = None

    @classmethod
    def try_load(
        cls,
        entry: PluginEntry,
    ) -> Result[PluginInstance, str]:
        package = entry.dist
        stage = "loading"
        try:
            plugin = entry.entry_point.load()
            stage = "validating"
            if not isinstance(plugin, Plugin):
                return Err(f"{plugin} is not a Plugin")
            stage = "importing"
            module = importlib.import_module(entry.entry_point.module)
            return Ok(
                cls(
                    plugin=plugin,
                    entry=entry,
                    module=module,
                )
            )
        except Exception as e:
            logger.opt(exception=e).error(
                f"Error while {stage} plugin {entry.name} from {package.name if package else 'unknown'}"
            )
            return Err(f"Error while {stage} plugin {entry.name}: {e}")

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
        new_plugin = self.entry.entry_point.load()
        if not isinstance(new_plugin, Plugin):
            raise ValueError(f"Invalid plugin: {new_plugin} is not a Plugin")
        self.plugin = new_plugin

    async def terminate(self, server: Server):
        if self.process is not None:
            try:
                self.process.terminate()
                self.process.join()
            except AttributeError:
                logger.warning(f"Error terminating plugin {self.entry.name}")
            except Exception as e:
                logger.opt(exception=e).error(f"Error terminating plugin {self.entry.name}")
            self.process = None
        if self.omu is not None:
            await self.omu.stop()
            self.omu = None
        if self.plugin.on_stop is not None:
            await self.plugin.on_stop(StopContext(server=server))

    async def start(self, server: Server):
        stage = "invoking on_start"
        try:
            if self.plugin.on_start is not None:
                await self.plugin.on_start(StartContext(server=server))
            stage = "generating token"
            token = server.security.generate_plugin_token()
            if self.plugin.isolated:
                stage = "starting isolated"
                self._start_isolated(server, token)
            else:
                stage = "starting internally"
                await self._start_internally(server, token)
        except Exception as e:
            logger.opt(exception=e).error(f"Error while {stage} plugin {self.entry.name}")

    async def _start_internally(self, server: Server, token: str):
        if self.omu:
            raise ValueError(f'Plugin "{self.plugin}" already started')
        if self.plugin.get_client is not None:
            connection = PluginConnection()
            self.omu = self.plugin.get_client()
            if self.omu.app.type != AppType.PLUGIN:
                raise ValueError(f"Invalid plugin: {self.omu.app} is not a plugin")
            self.omu.network.set_connection(connection)
            self.omu.network.set_token_provider(PluginTokenProvider(token))
            self.omu.set_loop(server.loop)
            self.omu.loop.create_task(self.omu.start(reconnect=False))
            session_connection = PluginSessionConnection(connection)
            session = await Session.from_connection(
                server,
                server.packets.packet_mapper,
                session_connection,
            )
            server.loop.create_task(server.sessions.process_new(session))

    def _start_isolated(self, server: Server, token: str):
        pid = os.getpid()
        if self.process:
            raise ValueError(f'Plugin "{self.plugin}" already started')
        process = Process(
            target=run_plugin_isolated,
            args=(
                self.entry.entry_point,
                server.address,
                token,
                pid,
            ),
            name=f"Plugin {self.entry.entry_point.value}",
            daemon=True,
        )
        process.start()
        self.process = process


def run_plugin_isolated(
    entry_point: importlib.metadata.EntryPoint,
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

    package = entry_point.dist
    stage = "loading"
    try:
        plugin = entry_point.load()
        stage = "validating"
        if not isinstance(plugin, Plugin):
            raise ValueError(f"Invalid plugin: {plugin} is not a Plugin")
        stage = "starting"
        if plugin.get_client is None:
            raise ValueError(f"Invalid plugin: {plugin} has no client")
        client = plugin.get_client()
        if client.app.type != AppType.PLUGIN:
            raise ValueError(f"Invalid plugin: {client.app} is not a plugin")
        stage = "setting up"
        setup_logger(name=client.app.id.get_sanitized_key())
        logger.info(f"Starting plugin {client.app.id} {client.app.version}")
        transport = WebsocketsTransport(address)
        client.network.set_transport(transport)
        client.network.set_token_provider(PluginTokenProvider(token))
        loop = asyncio.new_event_loop()
        loop.set_exception_handler(asyncio_error_logger)

        def stop_plugin():
            logger.info(f"Stopping plugin {client.app.id}")
            loop.stop()
            exit(0)

        client.network.event.disconnected += stop_plugin
        stage = "running"
        client.run(loop=loop, reconnect=False)
        loop.run_forever()
    except Exception as e:
        logger.opt(exception=e).error(
            f"Error while {stage} plugin {entry_point.name} from {package.name if package else 'unknown'}"
        )
        return None

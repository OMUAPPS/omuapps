from __future__ import annotations

import asyncio
import importlib
import importlib.metadata
import io
import os
import sys
from dataclasses import dataclass
from multiprocessing import Process

from loguru import logger
from omu.address import Address
from omu.app import App
from omu.helper import asyncio_error_logger
from omu.network.websocket_connection import WebsocketsConnection
from omu.plugin import Plugin
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


@dataclass(frozen=True, slots=True)
class PluginInstance:
    plugin: Plugin

    @classmethod
    def from_entry_point(
        cls, entry_point: importlib.metadata.EntryPoint
    ) -> PluginInstance:
        plugin = entry_point.load()
        if not isinstance(plugin, Plugin):
            raise ValueError(f"Invalid plugin: {plugin} is not a Plugin")
        return cls(plugin=plugin)

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
                plugin_client.network.set_connection(connection)
                plugin_client.network.set_token_provider(PluginTokenProvider(token))
                await plugin_client.start()
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
        f"logs/{app.id.get_sanitized_path()}/{{time:YYYY-MM-DD}}.log",
        rotation="1 day",
        colorize=False,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
            "{name}:{function}:{line} - {message}"
        ),
    )


def run_plugin_isolated(
    plugin: Plugin,
    address: Address,
    token: str,
    pid: int,
) -> None:
    try:
        if plugin.get_client is None:
            raise ValueError(f"Invalid plugin: {plugin} has no client")
        client = plugin.get_client()
        setup_logging(client.app)
        connection = WebsocketsConnection(client, address)
        client.network.set_connection(connection)
        client.network.set_token_provider(PluginTokenProvider(token))
        loop = asyncio.new_event_loop()
        loop.set_exception_handler(asyncio_error_logger)
        loop.run_until_complete(client.start())
        loop.run_forever()
        loop.close()
    except Exception as e:
        logger.opt(exception=e).error("Error running plugin")

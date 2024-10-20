from __future__ import annotations

import asyncio

from omu import version
from omu.address import Address
from omu.app import App
from omu.event_emitter import Unlisten
from omu.extension import ExtensionRegistry
from omu.extension.asset import (
    ASSET_EXTENSION_TYPE,
    AssetExtension,
)
from omu.extension.dashboard import (
    DASHBOARD_EXTENSION_TYPE,
    DashboardExtension,
)
from omu.extension.endpoint import (
    ENDPOINT_EXTENSION_TYPE,
    EndpointExtension,
)
from omu.extension.i18n import (
    I18N_EXTENSION_TYPE,
    I18nExtension,
)
from omu.extension.logger import (
    LOGGER_EXTENSION_TYPE,
    LoggerExtension,
)
from omu.extension.permission import (
    PERMISSION_EXTENSION_TYPE,
    PermissionExtension,
)
from omu.extension.plugin import (
    PLUGIN_EXTENSION_TYPE,
    PluginExtension,
)
from omu.extension.registry import (
    REGISTRY_EXTENSION_TYPE,
    RegistryExtension,
)
from omu.extension.server import (
    SERVER_EXTENSION_TYPE,
    ServerExtension,
)
from omu.extension.signal import (
    SIGNAL_EXTENSION_TYPE,
    SignalExtension,
)
from omu.extension.table import (
    TABLE_EXTENSION_TYPE,
    TableExtension,
)
from omu.helper import Coro, asyncio_error_logger
from omu.network import Network
from omu.network.packet import Packet, PacketType
from omu.network.websocket_connection import WebsocketsConnection
from omu.token import JsonTokenProvider, TokenProvider

from .client import Client, ClientEvents


class Omu(Client):
    def __init__(
        self,
        app: App,
        address: Address | None = None,
        token: TokenProvider | None = None,
        connection: WebsocketsConnection | None = None,
        extension_registry: ExtensionRegistry | None = None,
        loop: asyncio.AbstractEventLoop | None = None,
    ):
        self._version = version.VERSION
        self._loop = self.set_loop(loop or asyncio.new_event_loop())
        self._ready = False
        self._running = False
        self._event = ClientEvents()
        self._app = app
        self.address = address or Address("127.0.0.1", 26423)
        self._network = Network(
            self,
            self.address,
            token or JsonTokenProvider(),
            connection or WebsocketsConnection(self, self.address),
        )
        self._extensions = extension_registry or ExtensionRegistry(self)

        self._endpoints = self.extensions.register(ENDPOINT_EXTENSION_TYPE)
        self._plugins = self.extensions.register(PLUGIN_EXTENSION_TYPE)
        self._tables = self.extensions.register(TABLE_EXTENSION_TYPE)
        self._registries = self.extensions.register(REGISTRY_EXTENSION_TYPE)
        self._signals = self.extensions.register(SIGNAL_EXTENSION_TYPE)
        self._permissions = self.extensions.register(PERMISSION_EXTENSION_TYPE)
        self._server = self.extensions.register(SERVER_EXTENSION_TYPE)
        self._assets = self.extensions.register(ASSET_EXTENSION_TYPE)
        self._dashboard = self.extensions.register(DASHBOARD_EXTENSION_TYPE)
        self._i18n = self.extensions.register(I18N_EXTENSION_TYPE)
        self._logger = self.extensions.register(LOGGER_EXTENSION_TYPE)

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> asyncio.AbstractEventLoop:
        loop.set_exception_handler(asyncio_error_logger)
        self._loop = loop
        return loop

    @property
    def version(self) -> str:
        return self._version

    @property
    def ready(self) -> bool:
        return self._ready

    @property
    def app(self) -> App:
        return self._app

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        return self._loop

    @property
    def network(self) -> Network:
        return self._network

    @property
    def extensions(self) -> ExtensionRegistry:
        return self._extensions

    @property
    def endpoints(self) -> EndpointExtension:
        return self._endpoints

    @property
    def plugins(self) -> PluginExtension:
        return self._plugins

    @property
    def tables(self) -> TableExtension:
        return self._tables

    @property
    def registries(self) -> RegistryExtension:
        return self._registries

    @property
    def signals(self) -> SignalExtension:
        return self._signals

    @property
    def assets(self) -> AssetExtension:
        return self._assets

    @property
    def server(self) -> ServerExtension:
        return self._server

    @property
    def permissions(self) -> PermissionExtension:
        return self._permissions

    @property
    def dashboard(self) -> DashboardExtension:
        return self._dashboard

    @property
    def i18n(self) -> I18nExtension:
        return self._i18n

    @property
    def logger(self) -> LoggerExtension:
        return self._logger

    @property
    def running(self) -> bool:
        return self._running

    async def send[T](self, type: PacketType[T], data: T) -> None:
        await self._network.send(Packet(type, data))

    def run(
        self,
        *,
        loop: asyncio.AbstractEventLoop | None = None,
        reconnect: bool = True,
    ) -> None:
        self._loop = self.set_loop(loop or self._loop)

        async def _run():
            try:
                await self.start(reconnect=reconnect)
            finally:
                if self._running:
                    await self.stop()

        if self._loop is None:
            asyncio.run(_run())
        else:
            self._loop.create_task(_run())

    async def start(self, *, reconnect: bool = True) -> None:
        current_loop = asyncio.get_event_loop()
        if current_loop is not self.loop:
            raise RuntimeError("Start must be called from the same loop")
        if self._running:
            raise RuntimeError("Already running")
        self._running = True
        await self._event.started()
        await self._network.connect(reconnect=reconnect)

    async def stop(self) -> None:
        if not self._running:
            raise RuntimeError("Not running")
        self._running = False
        await self._network.disconnect()
        await self._event.stopped()

    @property
    def event(self) -> ClientEvents:
        return self._event

    def on_ready(self, coro: Coro[[], None]) -> Unlisten:
        if self._ready:
            self.loop.create_task(coro())
        return self.event.ready.listen(coro)

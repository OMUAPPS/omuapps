from __future__ import annotations

import asyncio
from typing import Final

from omu import version
from omu.address import Address
from omu.app import App
from omu.event_emitter import EventEmitter, Unlisten
from omu.helper import Coro, asyncio_error_logger
from omu.network.connection import Connection, Transport
from omu.network.packet import Packet, PacketType
from omu.network.packet.packet_types import PACKET_TYPES
from omu.network.websocket_connection import WebsocketsTransport
from omu.token import JsonTokenProvider, TokenProvider


class ClientEvents:
    def __init__(self) -> None:
        self.started = EventEmitter[[]]()
        self.stopped = EventEmitter[[]]()
        self.ready = EventEmitter[[]]()


class Omu:
    def __init__(
        self,
        app: App,
        address: Address | None = None,
        token: TokenProvider | None = None,
        connection: Connection | None = None,
        transport: Transport | None = None,
        loop: asyncio.AbstractEventLoop | None = None,
    ):
        from omu.api.asset.extension import ASSET_EXTENSION_TYPE
        from omu.api.dashboard.extension import DASHBOARD_EXTENSION_TYPE
        from omu.api.endpoint.extension import ENDPOINT_EXTENSION_TYPE
        from omu.api.i18n.extension import I18N_EXTENSION_TYPE
        from omu.api.logger.extension import LOGGER_EXTENSION_TYPE
        from omu.api.permission.extension import PERMISSION_EXTENSION_TYPE
        from omu.api.plugin.extension import PLUGIN_EXTENSION_TYPE
        from omu.api.registry.extension import REGISTRY_EXTENSION_TYPE
        from omu.api.server.extension import SERVER_EXTENSION_TYPE
        from omu.api.session.extension import SESSION_EXTENSION_TYPE
        from omu.api.signal.extension import SIGNAL_EXTENSION_TYPE
        from omu.api.table.extension import TABLE_EXTENSION_TYPE
        from omu.network import Network

        self.version: Final = version.VERSION
        self.loop = self.set_loop(loop or asyncio.new_event_loop())
        self._ready = False
        self._running = False
        self.event: Final = ClientEvents()
        self.app: Final = app
        self.address = address or Address("127.0.0.1", 26423)
        self.network: Final = Network(
            self,
            self.address,
            token or JsonTokenProvider(),
            transport=transport or WebsocketsTransport(self.address),
            connection=connection,
        )
        self.network.add_packet_handler(PACKET_TYPES.READY, self._handle_ready)

        self.sessions = SESSION_EXTENSION_TYPE.create(self)
        self.endpoints: Final = ENDPOINT_EXTENSION_TYPE.create(self)
        self.plugins: Final = PLUGIN_EXTENSION_TYPE.create(self)
        self.tables: Final = TABLE_EXTENSION_TYPE.create(self)
        self.registries: Final = REGISTRY_EXTENSION_TYPE.create(self)
        self.signals: Final = SIGNAL_EXTENSION_TYPE.create(self)
        self.permissions: Final = PERMISSION_EXTENSION_TYPE.create(self)
        self.server: Final = SERVER_EXTENSION_TYPE.create(self)
        self.assets: Final = ASSET_EXTENSION_TYPE.create(self)
        self.dashboard: Final = DASHBOARD_EXTENSION_TYPE.create(self)
        self.i18n: Final = I18N_EXTENSION_TYPE.create(self)
        self.logger: Final = LOGGER_EXTENSION_TYPE.create(self)

    async def _handle_ready(self, detail: None) -> None:
        self._ready = True
        await self.event.ready()

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> asyncio.AbstractEventLoop:
        loop.set_exception_handler(asyncio_error_logger)
        self.loop = loop
        return loop

    @property
    def ready(self) -> bool:
        return self._ready

    @property
    def running(self) -> bool:
        return self._running

    async def send[T](self, type: PacketType[T], data: T) -> None:
        await self.network.send(Packet(type, data))

    def run(
        self,
        *,
        loop: asyncio.AbstractEventLoop | None = None,
        reconnect: bool = True,
    ) -> None:
        self.loop = self.set_loop(loop or self.loop)

        async def _run():
            try:
                await self.start(reconnect=reconnect)
            finally:
                if self._running:
                    await self.stop()

        if self.loop is None:
            asyncio.run(_run())
        else:
            self.loop.create_task(_run())

    async def start(self, *, reconnect: bool = True) -> None:
        current_loop = asyncio.get_event_loop()
        if current_loop is not self.loop:
            raise RuntimeError("Start must be called from the same loop")
        if self._running:
            raise RuntimeError("Already running")
        self._running = True
        await self.event.started()
        await self.network.connect(reconnect=reconnect)

    async def stop(self) -> None:
        if not self._running:
            raise RuntimeError("Not running")
        self._running = False
        await self.network.close()
        await self.event.stopped()

    def on_ready(self, coro: Coro[[], None]) -> Unlisten:
        if self._ready:
            self.loop.create_task(coro())
        return self.event.ready.listen(coro)

    async def wait_for_ready(self):
        if self._ready:
            return

        unlisten: Unlisten | None = None
        future = self.loop.create_future()

        async def _wait_for_ready():
            nonlocal unlisten
            if unlisten is not None:
                unlisten()
            future.set_result(None)

        unlisten = self.event.ready.listen(_wait_for_ready)
        await future

from __future__ import annotations

import abc
import asyncio
from typing import TYPE_CHECKING

from omu.app import App
from omu.event_emitter import EventEmitter, Unlisten
from omu.helper import Coro

if TYPE_CHECKING:
    from omu.extension import ExtensionRegistry
    from omu.extension.dashboard import DashboardExtension
    from omu.extension.endpoint import EndpointExtension
    from omu.extension.i18n import I18nExtension
    from omu.extension.logger import LoggerExtension
    from omu.extension.permission import PermissionExtension
    from omu.extension.plugin import PluginExtension
    from omu.extension.registry import RegistryExtension
    from omu.extension.server import ServerExtension
    from omu.extension.signal import SignalExtension
    from omu.extension.table import TableExtension
    from omu.network import Network
    from omu.network.packet import PacketType


class ClientEvents:
    def __init__(self) -> None:
        self.started = EventEmitter[[]]()
        self.stopped = EventEmitter[[]]()
        self.ready = EventEmitter[[]]()


class Client(abc.ABC):
    @property
    @abc.abstractmethod
    def ready(self) -> bool: ...

    @property
    @abc.abstractmethod
    def app(self) -> App: ...

    @property
    @abc.abstractmethod
    def loop(self) -> asyncio.AbstractEventLoop: ...

    @property
    @abc.abstractmethod
    def network(self) -> Network: ...

    @property
    @abc.abstractmethod
    def extensions(self) -> ExtensionRegistry: ...

    @property
    @abc.abstractmethod
    def endpoints(self) -> EndpointExtension: ...

    @property
    @abc.abstractmethod
    def plugins(self) -> PluginExtension: ...

    @property
    @abc.abstractmethod
    def tables(self) -> TableExtension: ...

    @property
    @abc.abstractmethod
    def registries(self) -> RegistryExtension: ...

    @property
    @abc.abstractmethod
    def signals(self) -> SignalExtension: ...

    @property
    @abc.abstractmethod
    def server(self) -> ServerExtension: ...

    @property
    @abc.abstractmethod
    def permissions(self) -> PermissionExtension: ...

    @property
    @abc.abstractmethod
    def dashboard(self) -> DashboardExtension: ...

    @property
    @abc.abstractmethod
    def i18n(self) -> I18nExtension: ...

    @property
    @abc.abstractmethod
    def logger(self) -> LoggerExtension: ...

    @property
    @abc.abstractmethod
    def running(self) -> bool: ...

    @abc.abstractmethod
    def run(
        self,
        *,
        loop: asyncio.AbstractEventLoop | None = None,
        reconnect: bool = True,
    ) -> None: ...

    @abc.abstractmethod
    async def start(self) -> None: ...

    @abc.abstractmethod
    async def stop(self) -> None: ...

    @abc.abstractmethod
    async def send[T](self, type: PacketType[T], data: T) -> None: ...

    @property
    @abc.abstractmethod
    def event(self) -> ClientEvents: ...

    @abc.abstractmethod
    def on_ready(self, coro: Coro[[], None]) -> Unlisten: ...

from __future__ import annotations

import os
from collections.abc import Callable, Mapping
from typing import TYPE_CHECKING

from omu.api.server.extension import (
    SERVER_APP_TABLE_TYPE,
    SHUTDOWN_ENDPOINT_TYPE,
    TRUSTED_ORIGINS_REGISTRY_TYPE,
)
from omu.app import App
from omu.network.packet.packet_types import DisconnectType

from omuserver.session import Session

from .permissions import (
    SERVER_APPS_READ_PERMISSION,
    SERVER_APPS_WRITE_PERMISSION,
    SERVER_SHUTDOWN_PERMISSION,
    SERVER_TRUSTED_ORIGINS_GET_PERMISSION,
)

if TYPE_CHECKING:
    from loguru import Message

    from omuserver.server import Server


class LogHandler:
    def __init__(
        self,
        callback: Callable[[str], None],
    ) -> None:
        self.callback = callback

    def write(self, message: Message) -> None:
        self.callback(message)


class ServerExtension:
    def __init__(self, server: Server) -> None:
        self._server = server
        server.security.register_permission(
            SERVER_SHUTDOWN_PERMISSION,
            SERVER_APPS_READ_PERMISSION,
            SERVER_APPS_WRITE_PERMISSION,
            SERVER_TRUSTED_ORIGINS_GET_PERMISSION,
        )
        server.endpoints.bind(SHUTDOWN_ENDPOINT_TYPE, self.handle_shutdown)
        self.apps = self._server.tables.register(SERVER_APP_TABLE_TYPE)
        self.apps.event.remove += self.on_remove_app
        self.trusted_origins = self._server.registries.register(TRUSTED_ORIGINS_REGISTRY_TYPE)

    async def on_remove_app(self, items: Mapping[str, App]):
        for app in items.values():
            self._server.security.remove_app(app.id)
            session = self._server.sessions.sessions.get(app.id)
            if session:
                await session.disconnect(DisconnectType.APP_REMOVED, f"App {app.id.key()} removed")

    async def handle_shutdown(self, session: Session, restart: bool = False) -> bool:
        await self.shutdown(restart)
        return True

    async def shutdown(self, restart: bool = False) -> None:
        try:
            if restart:
                await self._server.restart()
            else:
                await self._server.stop()
        finally:
            os._exit(0)

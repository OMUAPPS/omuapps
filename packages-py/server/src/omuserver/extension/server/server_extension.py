from __future__ import annotations

from asyncio import Future
from collections import defaultdict
from collections.abc import Callable
from typing import TYPE_CHECKING

from loguru import logger
from omu.extension.server.server_extension import (
    REQUIRE_APPS_PACKET_TYPE,
    SERVER_APP_TABLE_TYPE,
    SERVER_SESSION_TABLE_TYPE,
    SHUTDOWN_ENDPOINT_TYPE,
)
from omu.identifier import Identifier

from omuserver.helper import get_launch_command
from omuserver.server import Server
from omuserver.session import Session

from .permissions import (
    SERVER_APPS_READ_PERMISSION,
    SERVER_SHUTDOWN_PERMISSION,
)

if TYPE_CHECKING:
    from loguru import Message


class WaitHandle:
    def __init__(self, ids: list[Identifier]):
        self.future = Future()
        self.ids = ids


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
        server.packet_dispatcher.register(
            REQUIRE_APPS_PACKET_TYPE,
        )
        server.permission_manager.register(
            SERVER_SHUTDOWN_PERMISSION,
            SERVER_APPS_READ_PERMISSION,
        )
        self.apps = self._server.tables.register(SERVER_APP_TABLE_TYPE)
        self.sessions = self._server.tables.register(SERVER_SESSION_TABLE_TYPE)
        server.network.event.connected += self.on_connected
        server.network.event.disconnected += self.on_disconnected
        server.event.start += self.on_start
        server.endpoints.bind_endpoint(
            SHUTDOWN_ENDPOINT_TYPE,
            self.handle_shutdown,
        )
        server.packet_dispatcher.add_packet_handler(
            REQUIRE_APPS_PACKET_TYPE, self.handle_require_apps
        )
        self._app_waiters: dict[Identifier, list[WaitHandle]] = defaultdict(list)

    async def handle_require_apps(
        self, session: Session, app_ids: list[Identifier]
    ) -> None:
        for identifier in self._server.network._sessions.keys():
            if identifier not in app_ids:
                continue
            app_ids.remove(identifier)
        if len(app_ids) == 0:
            return

        async def task():
            waiter = WaitHandle(app_ids)
            for app_id in app_ids:
                self._app_waiters[app_id].append(waiter)
            await waiter.future

        session.add_ready_task(task)

    async def handle_shutdown(self, session: Session, restart: bool = False) -> bool:
        await self._server.shutdown()
        self._server.loop.create_task(self.shutdown(restart))
        return True

    async def shutdown(self, restart: bool = False) -> None:
        if restart:
            import os
            import sys

            os.execv(sys.executable, get_launch_command()["args"])
        else:
            self._server.loop.stop()

    async def on_start(self) -> None:
        await self.apps.clear()

    async def on_connected(self, session: Session) -> None:
        logger.info(f"Connected: {session.app.key()}")
        await self.sessions.add(session.app)
        await self.apps.add(session.app)
        unlisten = session.event.ready.listen(self.on_session_ready)

        session.event.disconnected.listen(lambda session: unlisten())

    async def on_session_ready(self, session: Session) -> None:
        for waiter in self._app_waiters.get(session.app.id, []):
            waiter.ids.remove(session.app.id)
            if len(waiter.ids) == 0:
                waiter.future.set_result(True)

    async def on_disconnected(self, session: Session) -> None:
        logger.info(f"Disconnected: {session.app.key()}")
        await self.sessions.remove(session.app)

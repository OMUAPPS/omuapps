from __future__ import annotations

from asyncio import Future
from collections import defaultdict
from typing import TYPE_CHECKING, Final

from loguru import logger
from omu.address import get_lan_ip
from omu.api.session.extension import (
    GENERATE_TOKEN_ENDPOINT_TYPE,
    REMOTE_APP_REQUEST_ENDPOINT_TYPE,
    SESSION_CONNECTED_PACKET_TYPE,
    SESSION_DISCONNECTED_PACKET_TYPE,
    SESSION_OBSERVE_PACKET_TYPE,
    SESSION_REQUIRE_PACKET_TYPE,
    SESSION_TABLE_TYPE,
    SESSIONS_READ_PERMISSION_ID,
    GenerateTokenPayload,
    GenerateTokenResponse,
    RemoteAppRequestPayload,
    RequestRemoteAppResponse,
)
from omu.app import App, AppType
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from omu.network.packet.packet_types import DisconnectType

if TYPE_CHECKING:
    from omuserver.server import Server
from omuserver.session import Session, TaskPriority

from .permissions import GENERATE_TOKEN_PERMISSION, REMOTE_APP_REQUEST_PERMISSION, SESSIONS_READ_PERMISSION


class SessionWaiter:
    def __init__(self, ids: list[Identifier]):
        self.future = Future()
        self.ids = ids


class SessionExtension:
    def __init__(self, server: Server):
        self.server = server
        server.security.register_permission(
            REMOTE_APP_REQUEST_PERMISSION,
            SESSIONS_READ_PERMISSION,
            GENERATE_TOKEN_PERMISSION,
        )
        self.sessions: Final[dict[Identifier, Session]] = {}
        self.session_table = server.tables.register(SESSION_TABLE_TYPE)
        self.session_waiters: dict[Identifier, list[SessionWaiter]] = defaultdict(list)
        self.session_observers: dict[Identifier, list[Session]] = defaultdict(list)
        server.endpoints.bind(REMOTE_APP_REQUEST_ENDPOINT_TYPE, self.handle_remote_app_request)
        server.endpoints.bind(GENERATE_TOKEN_ENDPOINT_TYPE, self.handle_generate_token)
        server.packets.register(
            SESSION_REQUIRE_PACKET_TYPE,
            SESSION_OBSERVE_PACKET_TYPE,
            SESSION_CONNECTED_PACKET_TYPE,
            SESSION_DISCONNECTED_PACKET_TYPE,
        )
        server.packets.bind(SESSION_REQUIRE_PACKET_TYPE, self.handle_require)
        server.packets.bind(SESSION_OBSERVE_PACKET_TYPE, self.handle_observe)
        server.event.start += self.on_start

    async def on_start(self):
        await self.session_table.clear()

    async def handle_require(self, session: Session, app_ids: list[Identifier]) -> None:
        if len(app_ids) == 0:
            return

        async def task():
            for app_id in app_ids:
                existing_session = self.server.sessions.find(app_id)
                if existing_session:
                    await existing_session.wait_ready()
                    continue
                waiter = SessionWaiter(app_ids)
                for app_id in app_ids:
                    self.session_waiters[app_id].append(waiter)
                await waiter.future

        session.add_task(
            task,
            name="session_require",
            detail=f"Requiring sessions: {', '.join(map(Identifier.key, app_ids))}",
            priority=TaskPriority.AFTER_PLUGIN,
        )

    async def handle_observe(self, session: Session, app_ids: list[Identifier]) -> None:
        if not session.permissions.has(SESSIONS_READ_PERMISSION_ID):
            raise PermissionDenied(f"Pemission {SESSIONS_READ_PERMISSION_ID} required to observe session")
        for app_id in app_ids:
            self.session_observers[app_id].append(session)

            def on_disconnect(session, app_id=app_id):
                if session in self.session_observers[app_id]:
                    self.session_observers[app_id].remove(session)

            session.event.disconnected.listen(on_disconnect)

    async def handle_generate_token(self, session: Session, request: GenerateTokenPayload) -> GenerateTokenResponse:
        requested_app = App.from_json(request["app"])
        if session.app.parent_id:
            return {"type": "error", "message": "Only parent apps can generate tokens"}
        if session.kind != AppType.DASHBOARD:
            if not requested_app.id.is_subpath_of(session.id):
                return {"type": "error", "message": "You can only generate tokens for sibling apps"}
            if requested_app.parent_id is None:
                return {"type": "error", "message": "You can only generate tokens for child apps"}
            if requested_app.parent_id != session.app.id:
                return {"type": "error", "message": "You can only generate tokens for your own child apps"}
        permissions = list(map(Identifier.from_key, request["permissions"]))
        if not session.permissions.has_all(permissions):
            missing_permissions = [p for p in permissions if not session.permissions.has(p)]
            return {
                "type": "error",
                "message": "You don't have permission to grant some of the requested permissions"
                + ", ".join(map(str, missing_permissions)),
            }
        handle, token = self.server.security.generate_app_token(requested_app)
        handle.grant_all(permissions)
        return {
            "type": "success",
            "token": token,
        }

    async def handle_remote_app_request(
        self, session: Session, request: RemoteAppRequestPayload
    ) -> RequestRemoteAppResponse:
        requested_app = App.from_json(request["app"])
        if session.app.parent_id:
            return {"type": "error", "message": "Only parent apps can generate tokens"}
        if session.kind != AppType.DASHBOARD:
            if not requested_app.id.is_subpath_of(session.id):
                return {"type": "error", "message": "You can only generate tokens for sibling apps"}
            if requested_app.parent_id is None:
                return {"type": "error", "message": "You can only generate tokens for child apps"}
            if requested_app.parent_id != session.app.id:
                return {"type": "error", "message": "You can only generate tokens for your own child apps"}
            if requested_app.url is None:
                return {"type": "error", "message": "Requested app must have a URL"}
        permissions = list(map(Identifier.from_key, request["permissions"]))
        if not session.permissions.has_all(permissions):
            missing_permissions = [p for p in permissions if not session.permissions.has(p)]
            return {
                "type": "error",
                "message": "You don't have permission to grant some of the requested permissions"
                + ", ".join(map(str, missing_permissions)),
            }
        handle, token = self.server.security.generate_app_token(requested_app)
        handle.grant_all(permissions)
        return {
            "type": "success",
            "token": token,
            "lan_ip": get_lan_ip(),
        }

    async def process_new(self, session: Session) -> None:
        logger.info(f"Connected: {session.app.key()}")
        existing_session = self.find(session.app.id)
        if existing_session:
            logger.warning(f"Session {session.app} already connected")
            await existing_session.disconnect(
                DisconnectType.ANOTHER_CONNECTION,
                f"Another connection from {session.app}",
            )
        self.sessions[session.app.id] = session
        session.event.disconnected += self.handle_disconnection
        await self.server.server.apps.update(session.app)
        await self.session_table.add(session.app)
        unlisten = session.event.ready.listen(self.on_session_ready)
        session.event.disconnected.listen(lambda _: unlisten())
        await session.listen()

    def iter(self):
        return self.sessions.values()

    async def on_disconnected(self, session: Session) -> None:
        logger.info(f"Disconnected: {session.app.key()}")
        await self.session_table.remove(session.app)

        for observer in self.session_observers.get(session.app.id, []):
            if session.closed:
                continue
            await observer.send(SESSION_DISCONNECTED_PACKET_TYPE, session.app)

    async def handle_disconnection(self, session: Session) -> None:
        if session.app.id not in self.sessions:
            return
        del self.sessions[session.app.id]

    def find(self, id: Identifier) -> Session | None:
        return self.sessions.get(id)

    async def on_session_ready(self, session: Session) -> None:
        for waiter in self.session_waiters.get(session.app.id, []):
            if session.app.id in waiter.ids:
                waiter.ids.remove(session.app.id)
            if len(waiter.ids) == 0:
                waiter.future.set_result(True)
                self.session_waiters.pop(session.app.id)
        for observer in self.session_observers.get(session.app.id, []):
            await observer.send(
                SESSION_CONNECTED_PACKET_TYPE,
                session.app,
            )

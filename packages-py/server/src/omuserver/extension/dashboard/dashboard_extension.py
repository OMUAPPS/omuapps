from __future__ import annotations

import json
import time
from asyncio import Future
from typing import TYPE_CHECKING

from omu.app import App, AppType
from omu.errors import PermissionDenied
from omu.extension.dashboard.dashboard_extension import (
    DASHBOARD_APP_INSTALL_ACCEPT_PACKET,
    DASHBOARD_APP_INSTALL_DENY_PACKET,
    DASHBOARD_APP_INSTALL_ENDPOINT,
    DASHBOARD_APP_INSTALL_PACKET,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_APP_TABLE_TYPE,
    DASHBOARD_APP_UPDATE_ACCEPT_PACKET,
    DASHBOARD_APP_UPDATE_DENY_PACKET,
    DASHBOARD_APP_UPDATE_ENDPOINT,
    DASHBOARD_APP_UPDATE_PACKET,
    DASHBOARD_APP_UPDATE_PERMISSION_ID,
    DASHBOARD_OPEN_APP_ENDPOINT,
    DASHBOARD_OPEN_APP_PACKET,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_PERMISSION_ACCEPT_PACKET,
    DASHBOARD_PERMISSION_DENY_PACKET,
    DASHBOARD_PERMISSION_REQUEST_PACKET,
    DASHBOARD_PLUGIN_ACCEPT_PACKET,
    DASHBOARD_PLUGIN_DENY_PACKET,
    DASHBOARD_PLUGIN_REQUEST_PACKET,
    DASHBOARD_SET_ENDPOINT,
    DashboardSetResponse,
)
from omu.extension.dashboard.packets import (
    AppInstallRequestPacket,
    AppInstallResponse,
    AppUpdateRequestPacket,
    AppUpdateResponse,
    PermissionRequestPacket,
    PluginRequestPacket,
)
from omu.identifier import Identifier

from omuserver.session import Session

from .permission import (
    DASHBOARD_APP_INSTALL_PERMISSION,
    DASHBOARD_APP_UPDATE_PERMISSION,
    DASHBOARD_OPEN_APP_PERMISSION,
    DASHBOARD_SET_PERMISSION,
    DASHOBARD_APP_EDIT_PERMISSION,
    DASHOBARD_APP_READ_PERMISSION,
)

if TYPE_CHECKING:
    from omuserver.server import Server


class DashboardExtension:
    def __init__(self, server: Server) -> None:
        self.server = server
        server.packets.register(
            DASHBOARD_PERMISSION_REQUEST_PACKET,
            DASHBOARD_PERMISSION_ACCEPT_PACKET,
            DASHBOARD_PERMISSION_DENY_PACKET,
            DASHBOARD_PLUGIN_REQUEST_PACKET,
            DASHBOARD_PLUGIN_ACCEPT_PACKET,
            DASHBOARD_PLUGIN_DENY_PACKET,
            DASHBOARD_APP_INSTALL_PACKET,
            DASHBOARD_APP_INSTALL_ACCEPT_PACKET,
            DASHBOARD_APP_INSTALL_DENY_PACKET,
            DASHBOARD_APP_UPDATE_PACKET,
            DASHBOARD_APP_UPDATE_ACCEPT_PACKET,
            DASHBOARD_APP_UPDATE_DENY_PACKET,
        )
        server.security.register(
            DASHBOARD_SET_PERMISSION,
            DASHBOARD_OPEN_APP_PERMISSION,
            DASHOBARD_APP_READ_PERMISSION,
            DASHOBARD_APP_EDIT_PERMISSION,
            DASHBOARD_APP_INSTALL_PERMISSION,
            DASHBOARD_APP_UPDATE_PERMISSION,
        )
        server.packets.bind(DASHBOARD_PERMISSION_ACCEPT_PACKET, self.handle_permission_accept)
        server.packets.bind(DASHBOARD_PERMISSION_DENY_PACKET, self.handle_permission_deny)
        server.packets.bind(DASHBOARD_PLUGIN_ACCEPT_PACKET, self.handle_plugin_accept)
        server.packets.bind(DASHBOARD_PLUGIN_DENY_PACKET, self.handle_plugin_deny)
        server.packets.bind(DASHBOARD_APP_INSTALL_ACCEPT_PACKET, self.handle_app_install_accept)
        server.packets.bind(DASHBOARD_APP_INSTALL_DENY_PACKET, self.handle_app_install_deny)
        server.packets.bind(DASHBOARD_APP_UPDATE_ACCEPT_PACKET, self.handle_app_update_accept)
        server.packets.bind(DASHBOARD_APP_UPDATE_DENY_PACKET, self.handle_app_update_deny)
        server.endpoints.bind(DASHBOARD_SET_ENDPOINT, self.handle_dashboard_set)
        server.endpoints.bind(DASHBOARD_OPEN_APP_ENDPOINT, self.handle_dashboard_open_app)
        server.endpoints.bind(DASHBOARD_APP_INSTALL_ENDPOINT, self.handle_dashboard_app_install)
        server.endpoints.bind(DASHBOARD_APP_UPDATE_ENDPOINT, self.handle_dashboard_app_update)
        server.network.event.connected += self.handle_session_connected
        self.apps = server.tables.register(DASHBOARD_APP_TABLE_TYPE)
        self.dashboard_session: Session | None = None
        self.pending_permission_requests: dict[str, PermissionRequestPacket] = {}
        self.permission_requests: dict[str, Future[bool]] = {}
        self.pending_plugin_requests: dict[str, PluginRequestPacket] = {}
        self.plugin_requests: dict[str, Future[bool]] = {}
        self.pending_app_install_requests: dict[str, AppInstallRequestPacket] = {}
        self.app_install_requests: dict[str, Future[bool]] = {}
        self.pending_app_update_requests: dict[str, AppUpdateRequestPacket] = {}
        self.app_update_requests: dict[str, Future[bool]] = {}
        self.request_id = 0

    async def handle_session_connected(self, session: Session) -> None:
        if session.kind != AppType.APP:
            return
        exist_app = await self.apps.get(session.app.id.key())
        if exist_app is None:
            return
        old_metadata = json.dumps(exist_app.metadata)
        new_metadata = json.dumps(session.app.metadata)
        if old_metadata != new_metadata:
            await self.update_app(session.app)

    async def handle_dashboard_open_app(self, session: Session, app: App) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        if not session.permissions.has(DASHBOARD_OPEN_APP_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to open apps")
        await self.dashboard_session.send(DASHBOARD_OPEN_APP_PACKET, app)

    async def handle_dashboard_set(self, session: Session, identifier: Identifier) -> DashboardSetResponse:
        if session.kind != AppType.DASHBOARD:
            raise PermissionDenied("Session is not a dashboard")
        self.dashboard_session = session
        session.event.disconnected += self._on_dashboard_disconnected
        await self.send_pending_permission_requests()
        await self.send_pending_plugin_requests()
        await self.send_pending_app_install_requests()
        await self.send_pending_app_update_requests()
        return {"success": True}

    async def send_pending_permission_requests(self) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        for request in self.pending_permission_requests.values():
            await self.dashboard_session.send(
                DASHBOARD_PERMISSION_REQUEST_PACKET,
                request,
            )

    async def send_pending_plugin_requests(self) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        for request in self.pending_plugin_requests.values():
            await self.dashboard_session.send(
                DASHBOARD_PLUGIN_REQUEST_PACKET,
                request,
            )

    async def send_pending_app_install_requests(self) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        for request in self.pending_app_install_requests.values():
            await self.dashboard_session.send(
                DASHBOARD_APP_INSTALL_PACKET,
                request,
            )

    async def send_pending_app_update_requests(self) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        for request in self.pending_app_update_requests.values():
            await self.dashboard_session.send(
                DASHBOARD_APP_UPDATE_PACKET,
                request,
            )

    async def _on_dashboard_disconnected(self, session: Session) -> None:
        self.dashboard_session = None

    def ensure_dashboard_session(self, session: Session) -> bool:
        if session == self.dashboard_session:
            return True
        msg = f"Session {session} is not the dashboard session"
        raise PermissionDenied(msg)

    async def handle_permission_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.permission_requests:
            raise ValueError(f"Permission request with id {request_id} does not exist")
        del self.pending_permission_requests[request_id]
        future = self.permission_requests.pop(request_id)
        future.set_result(True)

    async def handle_permission_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.permission_requests:
            raise ValueError(f"Permission request with id {request_id} does not exist")
        del self.pending_permission_requests[request_id]
        future = self.permission_requests.pop(request_id)
        future.set_result(False)

    async def request_permissions(self, request: PermissionRequestPacket) -> bool:
        if request.request_id in self.permission_requests:
            raise ValueError(f"Permission request with id {request.request_id} already exists")
        future = Future[bool]()
        self.permission_requests[request.request_id] = future
        await self.notify_dashboard_permission_request(request)
        return await future

    async def notify_dashboard_permission_request(self, request: PermissionRequestPacket) -> None:
        self.pending_permission_requests[request.request_id] = request
        if self.dashboard_session is not None:
            await self.dashboard_session.send(
                DASHBOARD_PERMISSION_REQUEST_PACKET,
                request,
            )

    async def handle_plugin_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request_id} does not exist")
        del self.pending_plugin_requests[request_id]
        future = self.plugin_requests.pop(request_id)
        future.set_result(True)

    async def handle_plugin_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request_id} does not exist")
        del self.pending_plugin_requests[request_id]
        future = self.plugin_requests.pop(request_id)
        future.set_result(False)

    async def request_plugins(self, request: PluginRequestPacket) -> bool:
        if request.request_id in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request.request_id} already exists")
        future = Future[bool]()
        self.plugin_requests[request.request_id] = future
        await self.notify_dashboard_plugin_request(request)
        return await future

    async def notify_dashboard_plugin_request(self, request: PluginRequestPacket) -> None:
        self.pending_plugin_requests[request.request_id] = request
        if self.dashboard_session is not None:
            await self.dashboard_session.send(
                DASHBOARD_PLUGIN_REQUEST_PACKET,
                request,
            )

    async def handle_app_install_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_install_requests:
            raise ValueError(f"App install request with id {request_id} does not exist")
        del self.pending_app_install_requests[request_id]
        future = self.app_install_requests.pop(request_id)
        future.set_result(True)

    async def handle_app_install_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_install_requests:
            raise ValueError(f"App install request with id {request_id} does not exist")
        del self.pending_app_install_requests[request_id]
        future = self.app_install_requests.pop(request_id)
        future.set_result(False)

    async def handle_dashboard_app_install(self, session: Session, app: App) -> AppInstallResponse:
        if not session.permissions.has(DASHBOARD_APP_INSTALL_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to install apps")
        request_id = self.get_next_request_id()
        future = Future[bool]()
        self.app_install_requests[request_id] = future
        await self.notify_dashboard_app_install(AppInstallRequestPacket(request_id=request_id, app=app))
        accepted = await future
        if accepted:
            await self.apps.add(app)
        return AppInstallResponse(accepted=accepted)

    async def notify_dashboard_app_install(self, request: AppInstallRequestPacket) -> None:
        self.pending_app_install_requests[request.request_id] = request
        if self.dashboard_session is not None:
            await self.dashboard_session.send(
                DASHBOARD_APP_INSTALL_PACKET,
                request,
            )

    async def handle_app_update_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_update_requests:
            raise ValueError(f"App update request with id {request_id} does not exist")
        del self.pending_app_update_requests[request_id]
        future = self.app_update_requests.pop(request_id)
        future.set_result(True)

    async def handle_app_update_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_update_requests:
            raise ValueError(f"App update request with id {request_id} does not exist")
        del self.pending_app_update_requests[request_id]
        future = self.app_update_requests.pop(request_id)
        future.set_result(False)

    async def handle_dashboard_app_update(self, session: Session, app: App) -> AppUpdateResponse:
        if not session.permissions.has(DASHBOARD_APP_UPDATE_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to update apps")
        accepted = await self.update_app(app)
        return AppUpdateResponse(accepted=accepted)

    async def update_app(self, app: App) -> bool:
        old_app = await self.apps.get(app.id.key())
        if old_app is None:
            raise ValueError(f"App with id {app.id} does not exist")
        request_id = self.get_next_request_id()
        future = Future[bool]()
        self.app_update_requests[request_id] = future
        await self.notify_dashboard_app_update(
            AppUpdateRequestPacket(
                request_id=request_id,
                old_app=old_app,
                new_app=app,
            )
        )
        accepted = await future
        if accepted:
            await self.apps.add(app)
        return accepted

    async def notify_dashboard_app_update(self, request: AppUpdateRequestPacket) -> None:
        self.pending_app_update_requests[request.request_id] = request
        if self.dashboard_session is not None:
            await self.dashboard_session.send(
                DASHBOARD_APP_UPDATE_PACKET,
                request,
            )

    def get_next_request_id(self) -> str:
        self.request_id += 1
        return f"{self.request_id}-{time.time_ns()}"

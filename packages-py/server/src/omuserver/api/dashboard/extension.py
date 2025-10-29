from __future__ import annotations

import json
import time
from asyncio import Future
from typing import TYPE_CHECKING
from venv import logger

from omu.api.dashboard.extension import (
    DASHBOARD_ALLOWED_HOSTS,
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
    DASHBOARD_DRAG_DROP_READ_ENDPOINT,
    DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
    DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
    DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET,
    DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT,
    DASHBOARD_DRAG_DROP_REQUEST_PACKET,
    DASHBOARD_DRAG_DROP_STATE_PACKET,
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
    DASHBOARD_SPEECH_RECOGNITION,
    DASHBOARD_WEBVIEW_EVENT_PACKET,
    DashboardSetResponse,
    DragDropReadRequest,
    DragDropReadResponse,
    DragDropRequest,
    DragDropRequestDashboard,
    DragDropRequestResponse,
    FileDragPacket,
    WebviewEventPacket,
)
from omu.api.dashboard.packets import (
    AppInstallRequestPacket,
    AppInstallResponse,
    AppUpdateRequestPacket,
    AppUpdateResponse,
    PermissionRequestPacket,
    PluginRequestPacket,
)
from omu.app import App, AppType
from omu.errors import PermissionDenied
from omu.identifier import Identifier

from omuserver.session import Session

from .permission import (
    DASHBOARD_APP_INSTALL_PERMISSION,
    DASHBOARD_APP_UPDATE_PERMISSION,
    DASHBOARD_DRAG_DROP_PERMISSION,
    DASHBOARD_OPEN_APP_PERMISSION,
    DASHBOARD_SET_PERMISSION,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION,
    DASHBOARD_WEBVIEW_PERMISSION,
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
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET,
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
            DASHBOARD_WEBVIEW_EVENT_PACKET,
        )
        server.security.register_permission(
            DASHBOARD_SET_PERMISSION,
            DASHBOARD_OPEN_APP_PERMISSION,
            DASHOBARD_APP_READ_PERMISSION,
            DASHOBARD_APP_EDIT_PERMISSION,
            DASHBOARD_APP_INSTALL_PERMISSION,
            DASHBOARD_APP_UPDATE_PERMISSION,
            DASHBOARD_DRAG_DROP_PERMISSION,
            DASHBOARD_WEBVIEW_PERMISSION,
            DASHBOARD_SPEECH_RECOGNITION_PERMISSION,
        )
        server.packets.bind(DASHBOARD_PERMISSION_ACCEPT_PACKET, self.handle_permission_accept)
        server.packets.bind(DASHBOARD_PERMISSION_DENY_PACKET, self.handle_permission_deny)
        server.packets.bind(DASHBOARD_PLUGIN_ACCEPT_PACKET, self.handle_plugin_accept)
        server.packets.bind(DASHBOARD_PLUGIN_DENY_PACKET, self.handle_plugin_deny)
        server.packets.bind(DASHBOARD_APP_INSTALL_ACCEPT_PACKET, self.handle_app_install_accept)
        server.packets.bind(DASHBOARD_APP_INSTALL_DENY_PACKET, self.handle_app_install_deny)
        server.packets.bind(DASHBOARD_APP_UPDATE_ACCEPT_PACKET, self.handle_app_update_accept)
        server.packets.bind(DASHBOARD_APP_UPDATE_DENY_PACKET, self.handle_app_update_deny)
        server.packets.bind(DASHBOARD_DRAG_DROP_STATE_PACKET, self.handle_drag_drop_state)
        server.packets.bind(DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET, self.handle_drag_drop_request_approval)
        server.packets.bind(DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET, self.handle_drag_drop_read_response)
        server.packets.bind(DASHBOARD_WEBVIEW_EVENT_PACKET, self.handle_webview_event)
        server.endpoints.bind(DASHBOARD_SET_ENDPOINT, self.handle_dashboard_set)
        server.endpoints.bind(DASHBOARD_OPEN_APP_ENDPOINT, self.handle_dashboard_open_app)
        server.endpoints.bind(DASHBOARD_APP_INSTALL_ENDPOINT, self.handle_dashboard_app_install)
        server.endpoints.bind(DASHBOARD_APP_UPDATE_ENDPOINT, self.handle_dashboard_app_update)
        server.endpoints.bind(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, self.handle_drag_drop_request)
        server.endpoints.bind(DASHBOARD_DRAG_DROP_READ_ENDPOINT, self.handle_drag_drop_read)
        self.apps = server.tables.register(DASHBOARD_APP_TABLE_TYPE)
        self.allowed_hosts = server.tables.register(DASHBOARD_ALLOWED_HOSTS)
        self.speech_recognition = server.registries.register(DASHBOARD_SPEECH_RECOGNITION)
        self.dashboard_session: Session | None = None
        self.dashboard_wait_future: Future[Session] | None = None
        self.permission_requests: dict[str, Future[bool]] = {}
        self.plugin_requests: dict[str, Future[bool]] = {}
        self.app_install_requests: dict[str, Future[bool]] = {}
        self.app_update_requests: dict[str, Future[bool]] = {}
        self.drag_drop_requests: dict[str, Future[DragDropRequestResponse]] = {}
        self.drag_drop_sessions: dict[str, Session] = {}
        self.drag_drop_states: dict[str, Session] = {}
        self.drag_drop_read_requests: dict[str, Future[DragDropReadResponse]] = {}
        self.request_id = 0

    async def wait_dashboard_ready(self) -> Session:
        if self.dashboard_session:
            return self.dashboard_session
        if self.dashboard_wait_future:
            return await self.dashboard_wait_future
        self.dashboard_wait_future = Future()
        return await self.dashboard_wait_future

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
        if self.dashboard_wait_future:
            self.dashboard_wait_future.set_result(session)
            self.dashboard_wait_future = None
        return {"success": True}

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
        future = self.permission_requests.pop(request_id)
        future.set_result(True)

    async def handle_permission_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.permission_requests:
            raise ValueError(f"Permission request with id {request_id} does not exist")
        future = self.permission_requests.pop(request_id)
        future.set_result(False)

    async def request_permissions(self, request: PermissionRequestPacket) -> bool:
        if request.request_id in self.permission_requests:
            raise ValueError(f"Permission request with id {request.request_id} already exists")
        future = Future[bool]()
        self.permission_requests[request.request_id] = future
        dashboard = await self.wait_dashboard_ready()
        await dashboard.send(
            DASHBOARD_PERMISSION_REQUEST_PACKET,
            request,
        )
        return await future

    async def handle_plugin_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request_id} does not exist")
        future = self.plugin_requests.pop(request_id)
        future.set_result(True)

    async def handle_plugin_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request_id} does not exist")
        future = self.plugin_requests.pop(request_id)
        future.set_result(False)

    async def request_plugins(self, request: PluginRequestPacket) -> bool:
        if request.request_id in self.plugin_requests:
            raise ValueError(f"Plugin request with id {request.request_id} already exists")
        future = Future[bool]()
        self.plugin_requests[request.request_id] = future
        dashboard = await self.wait_dashboard_ready()
        await dashboard.send(
            DASHBOARD_PLUGIN_REQUEST_PACKET,
            request,
        )
        return await future

    async def handle_app_install_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_install_requests:
            raise ValueError(f"App install request with id {request_id} does not exist")
        future = self.app_install_requests.pop(request_id)
        future.set_result(True)

    async def handle_app_install_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_install_requests:
            raise ValueError(f"App install request with id {request_id} does not exist")
        future = self.app_install_requests.pop(request_id)
        future.set_result(False)

    async def handle_dashboard_app_install(self, session: Session, app: App) -> AppInstallResponse:
        if not session.permissions.has(DASHBOARD_APP_INSTALL_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to install apps")
        request_id = self.gen_next_request_id()
        future = Future[bool]()
        self.app_install_requests[request_id] = future
        dashboard = await self.wait_dashboard_ready()
        request = AppInstallRequestPacket(request_id=request_id, app=app)
        await dashboard.send(
            DASHBOARD_APP_INSTALL_PACKET,
            request,
        )
        accepted = await future
        if accepted:
            await self.apps.add(app)
        return AppInstallResponse(accepted=accepted)

    async def handle_app_update_accept(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_update_requests:
            raise ValueError(f"App update request with id {request_id} does not exist")
        future = self.app_update_requests.pop(request_id)
        future.set_result(True)

    async def handle_app_update_deny(self, session: Session, request_id: str) -> None:
        self.ensure_dashboard_session(session)
        if request_id not in self.app_update_requests:
            raise ValueError(f"App update request with id {request_id} does not exist")
        future = self.app_update_requests.pop(request_id)
        future.set_result(False)

    async def update_app(self, app: App) -> bool:
        old_app = await self.apps.get(app.id.key())
        if old_app is None:
            raise ValueError(f"App with id {app.id} does not exist")
        request_id = self.gen_next_request_id()
        future = Future[bool]()
        self.app_update_requests[request_id] = future
        dashboard = await self.wait_dashboard_ready()
        await dashboard.send(
            DASHBOARD_APP_UPDATE_PACKET,
            AppUpdateRequestPacket(
                request_id=request_id,
                old_app=old_app,
                new_app=app,
            ),
        )
        accepted = await future
        if accepted:
            await self.apps.add(app)
        return accepted

    async def handle_dashboard_app_update(self, session: Session, app: App) -> AppUpdateResponse:
        if not session.permissions.has(DASHBOARD_APP_UPDATE_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to update apps")
        accepted = await self.update_app(app)
        return AppUpdateResponse(accepted=accepted)

    async def handle_drag_drop_state(self, session: Session, packet: FileDragPacket):
        self.ensure_dashboard_session(session)
        app = packet["app"]
        target = self.drag_drop_sessions.get(app["id"], None)
        if target is None:
            logger.warning(
                f"Dashboard {self.dashboard_session} tried to send drag drop state to unknown app {app['id']}"
            )
            return
        self.drag_drop_states[packet["drag_id"]] = target
        await target.send(DASHBOARD_DRAG_DROP_STATE_PACKET, packet)

    async def handle_drag_drop_request_approval(self, session: Session, response: DragDropRequestResponse):
        self.ensure_dashboard_session(session)
        request = self.drag_drop_requests.pop(response["request_id"], None)
        if not request:
            msg = (
                f"Dashboard {self.dashboard_session} tried to {"approve" if response['ok'] else "deny"} "
                f"to unknown request {response['request_id']} with"
            )
            logger.warning(msg)
            return
        request.set_result(response)

    async def handle_drag_drop_request(self, session: Session, request: DragDropRequest) -> DragDropRequestResponse:
        dashboard = await self.wait_dashboard_ready()
        request_id = self.gen_next_request_id()
        request = DragDropRequestDashboard(
            request_id=request_id,
            app=session.app.to_json(),
        )
        await dashboard.send(DASHBOARD_DRAG_DROP_REQUEST_PACKET, request)
        future = Future[DragDropRequestResponse]()
        self.drag_drop_requests[request_id] = future
        response = await future
        if response["ok"]:
            self.drag_drop_sessions[session.app.key()] = session
        return response

    async def handle_drag_drop_read(self, session: Session, request: DragDropReadRequest) -> DragDropReadResponse:
        dashboard = await self.wait_dashboard_ready()
        target = self.drag_drop_states[request["drag_id"]]
        if target != session:
            msg = f"Session {session} tried to read invalid drag drop file"
            logger.warning(msg)
            raise PermissionDenied(msg)
        request_id = self.gen_next_request_id()
        await dashboard.send(
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            {"drag_id": request["drag_id"], "request_id": request_id},
        )
        future = Future[DragDropReadResponse]()
        self.drag_drop_read_requests[request_id] = future
        return await future

    async def handle_drag_drop_read_response(self, session: Session, response: DragDropReadResponse):
        drag_id = response.meta["request_id"]
        request = self.drag_drop_read_requests[drag_id]
        request.set_result(response)

    async def handle_webview_event(self, session: Session, packet: WebviewEventPacket):
        self.ensure_dashboard_session(session)
        target = self.server.sessions.find(packet.target)
        if target is None:
            return
        await target.send(DASHBOARD_WEBVIEW_EVENT_PACKET, packet)

    def gen_next_request_id(self) -> str:
        self.request_id += 1
        return f"{self.request_id}-{time.time_ns()}"

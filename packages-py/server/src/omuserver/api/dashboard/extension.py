from __future__ import annotations

import time
from asyncio import Future
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import TYPE_CHECKING
from venv import logger

from omu.api.dashboard.extension import (
    DASHBOARD_ALLOWED_WEBVIEW_HOSTS,
    DASHBOARD_APP_INSTALL_ENDPOINT,
    DASHBOARD_APP_INSTALL_PACKET,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_APP_UPDATE_PACKET,
    DASHBOARD_DRAG_DROP_READ_ENDPOINT,
    DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
    DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
    DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT,
    DASHBOARD_DRAG_DROP_REQUEST_PACKET,
    DASHBOARD_DRAG_DROP_STATE_PACKET,
    DASHBOARD_OPEN_APP_ENDPOINT,
    DASHBOARD_OPEN_APP_PACKET,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_PROMPT_CLEAR_BLOCKED,
    DASHBOARD_PROMPT_REQUEST,
    DASHBOARD_PROMPT_RESPONSE,
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
    PortProcess,
    PromptRequest,
    PromptResponse,
    PromptResult,
    WebviewEventPacket,
)
from omu.api.dashboard.packets import (
    AppInstallResponse,
)
from omu.api.permission.permission import PermissionType
from omu.api.plugin.package_info import PackageInfo
from omu.api.server.extension import AppIndexRegistryMeta
from omu.app import App, AppType
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from omu.result import Err, Ok
from psutil import AccessDenied
from yarl import URL

from omuserver.dependency import AppIndexRegistry
from omuserver.helper import find_processes_by_port
from omuserver.session import Session

from .permission import (
    DASHBOARD_APP_INSTALL_PERMISSION,
    DASHBOARD_DRAG_DROP_PERMISSION,
    DASHBOARD_OPEN_APP_PERMISSION,
    DASHBOARD_SET_PERMISSION,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION,
    DASHBOARD_WEBVIEW_PERMISSION,
)

if TYPE_CHECKING:
    from omuserver.server import Server


@dataclass(frozen=True, slots=True)
class PromptHandle:
    kind: str
    future: Future[PromptResult] = field(default_factory=Future)


class DashboardExtension:
    def __init__(self, server: Server) -> None:
        self.server = server
        server.packets.register(
            DASHBOARD_APP_INSTALL_PACKET,
            DASHBOARD_APP_UPDATE_PACKET,
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
            DASHBOARD_WEBVIEW_EVENT_PACKET,
            DASHBOARD_PROMPT_REQUEST,
            DASHBOARD_PROMPT_RESPONSE,
        )
        server.security.register_permission(
            DASHBOARD_SET_PERMISSION,
            DASHBOARD_OPEN_APP_PERMISSION,
            DASHBOARD_APP_INSTALL_PERMISSION,
            DASHBOARD_DRAG_DROP_PERMISSION,
            DASHBOARD_WEBVIEW_PERMISSION,
            DASHBOARD_SPEECH_RECOGNITION_PERMISSION,
        )
        server.packets.bind(DASHBOARD_DRAG_DROP_STATE_PACKET, self.handle_drag_drop_state)
        server.packets.bind(DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET, self.handle_drag_drop_read_response)
        server.packets.bind(DASHBOARD_WEBVIEW_EVENT_PACKET, self.handle_webview_event)
        server.packets.bind(DASHBOARD_PROMPT_RESPONSE, self.handle_prompt_response)
        server.endpoints.bind(DASHBOARD_PROMPT_CLEAR_BLOCKED, self.clear_blocked_prompts)
        server.endpoints.bind(DASHBOARD_SET_ENDPOINT, self.handle_dashboard_set)
        server.endpoints.bind(DASHBOARD_OPEN_APP_ENDPOINT, self.handle_dashboard_open_app)
        server.endpoints.bind(DASHBOARD_APP_INSTALL_ENDPOINT, self.handle_dashboard_app_install)
        server.endpoints.bind(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, self.handle_drag_drop_request)
        server.endpoints.bind(DASHBOARD_DRAG_DROP_READ_ENDPOINT, self.handle_drag_drop_read)
        self.allowed_webview_hosts = server.tables.register(DASHBOARD_ALLOWED_WEBVIEW_HOSTS)
        self.speech_recognition = server.registries.register(DASHBOARD_SPEECH_RECOGNITION)
        self.dashboard_session: Session | None = None
        self.dashboard_wait_future: Future[Session] | None = None
        self.prompt_requests: dict[str, PromptHandle] = {}
        self.prompt_keys: dict[str, PromptHandle] = {}
        self.blocked_prompts: set[str] = set()
        self.drag_drop_requests: dict[str, Future[DragDropRequestResponse]] = {}
        self.drag_drop_sessions: dict[str, Session] = {}
        self.drag_drop_states: dict[str, Session] = {}
        self.drag_drop_read_requests: dict[str, Future[DragDropReadResponse]] = {}
        self.request_id = 0

    async def _handle_app_remove(self, apps: Mapping[str, App]):
        for app in apps.values():
            self.server.security.remove_app(app.id)

    async def wait_dashboard_ready(self) -> Session:
        if self.dashboard_session:
            return self.dashboard_session
        if self.dashboard_wait_future:
            return await self.dashboard_wait_future
        self.dashboard_wait_future = Future()
        return await self.dashboard_wait_future

    async def handle_dashboard_open_app(self, session: Session, app: App) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
        if not session.permissions.has(DASHBOARD_OPEN_APP_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to open apps")
        await self.dashboard_session.send(DASHBOARD_OPEN_APP_PACKET, app)

    async def open_app(self, app: App) -> None:
        if self.dashboard_session is None:
            raise ValueError("Dashboard session not set")
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
        self.prompt_keys.clear()

    def ensure_dashboard_session(self, session: Session) -> bool:
        if session == self.dashboard_session:
            return True
        msg = f"Session {session} is not the dashboard session"
        raise PermissionDenied(msg)

    async def handle_prompt_response(self, session: Session, response: PromptResponse) -> None:
        self.ensure_dashboard_session(session)
        id = response["id"]

        if id not in self.prompt_requests:
            raise ValueError(f"Dashboard request with id {id} does not exist")

        handle = self.prompt_requests.pop(id)

        if handle.kind != response["kind"]:
            raise ValueError(
                f"The kind of Dashboard request with id {id} does not match {response['kind']} != {handle.kind}"
            )

        handle.future.set_result(response["result"])

    async def clear_blocked_prompts(self, session: Session, arg: None) -> None:
        self.blocked_prompts.clear()

    async def request_prompt(self, key: str, prompt: PromptRequest) -> bool:
        prompt_key = f"{prompt['kind']}-{key}"
        if prompt_key in self.blocked_prompts:
            return False
        if prompt_key in self.prompt_keys:
            return await self.prompt_keys[prompt_key].future == "accept"
        try:
            dashboard = await self.wait_dashboard_ready()
            if prompt["id"] in self.prompt_requests:
                raise ValueError(f"Permission request with id {prompt['id']} already exists")

            future = Future[PromptResult]()
            self.prompt_keys[prompt_key] = self.prompt_requests[prompt["id"]] = PromptHandle(prompt["kind"], future)

            await dashboard.send(
                DASHBOARD_PROMPT_REQUEST,
                prompt,
            )

            result = await future
            if result == "block":
                self.blocked_prompts.add(prompt_key)
            return result == "accept"
        finally:
            if prompt_key in self.prompt_keys:
                self.prompt_keys.pop(prompt_key)
            if prompt["id"] in self.prompt_requests:
                self.prompt_requests.pop(prompt["id"])

    async def request_permissions(self, app: App, permissions: list[PermissionType]) -> bool:
        return await self.request_prompt(
            app.id.key(),
            {
                "kind": "app/permissions",
                "id": self.get_next_request_id(),
                "app": app.to_json(),
                "permissions": list(map(PermissionType.to_json, permissions)),
            },
        )

    async def request_plugins(self, app: App, packages: list[PackageInfo]) -> bool:
        return await self.request_prompt(
            app.id.key(),
            {
                "kind": "app/plugins",
                "id": self.get_next_request_id(),
                "app": app.to_json(),
                "packages": packages,
            },
        )

    async def request_install(self, app: App, dependencies: dict[Identifier, App]) -> bool:
        return await self.request_prompt(
            app.id.key(),
            {
                "kind": "app/install",
                "id": self.get_next_request_id(),
                "app": app.to_json(),
                "dependencies": {k.key(): v.to_json() for k, v in dependencies.items()},
            },
        )

    async def handle_dashboard_app_install(self, session: Session, app: App) -> AppInstallResponse:
        if not session.permissions.has(DASHBOARD_APP_INSTALL_PERMISSION_ID):
            raise PermissionDenied("Session does not have permission to install apps")

        dependencies = await self.resolve_dependencies(app)

        if app.type == AppType.SERVICE and dependencies:
            raise Exception("Service apps cannot have dependencies")

        existing = self.server.security.apps.get(app.id)
        if existing:
            accepted = await self.notify_update_app(
                old_app=App.from_json(existing["app_json"]),
                new_app=app,
                dependencies=dependencies,
            )
        else:
            accepted = await self.request_install(app=app, dependencies=dependencies)

        if accepted:
            await self.server.server.apps.add(app, *dependencies.values())

        return AppInstallResponse(accepted=accepted)

    async def resolve_dependencies(self, app: App):
        indexes: dict[URL, AppIndexRegistry] = {}
        dependencies: dict[Identifier, App] = {}

        for dep_id_str, dep_specifier in (app.dependencies or {}).items():
            dep_id = Identifier.from_key(dep_id_str)

            match AppIndexRegistry.resolve_index_by_specifier(self.server, dep_id, dep_specifier):
                case Err(err):
                    raise Exception(f"Failed to resolve index URL for {dep_id}: {err}")
                case Ok(index_url):
                    pass

            if index_url not in indexes:
                match await AppIndexRegistry.try_fetch(index_url):
                    case Err(err):
                        raise Exception(f"Failed to fetch index from {index_url}: {err}")
                    case Ok(index):
                        indexes[index_url] = index

            index = indexes[index_url]
            if dep_id not in index.apps:
                raise Exception(f"Dependency {dep_id} not found in index {index_url}")
            dependencies[dep_id] = index.apps[dep_id]
        return dependencies

    async def notify_update_app(self, old_app: App, new_app: App, dependencies: dict[Identifier, App]) -> bool:
        return await self.request_prompt(
            old_app.id.key(),
            {
                "kind": "app/update",
                "id": self.get_next_request_id(),
                "old_app": old_app.to_json(),
                "new_app": new_app.to_json(),
                "dependencies": {k.key(): v.to_json() for k, v in dependencies.items()},
            },
        )

    async def notify_index_install(self, index_url: URL, meta: AppIndexRegistryMeta) -> bool:
        return await self.request_prompt(
            index_url.host or index_url.authority,
            {
                "kind": "index/install",
                "id": self.get_next_request_id(),
                "index_url": str(index_url),
                "meta": meta,
            },
        )

    async def notify_http_port_request(self, app: App, port: int) -> bool:
        processes: list[PortProcess] = []
        for process in find_processes_by_port(port):
            try:
                processes.append({"name": process.name(), "exe": process.exe(), "port": port})
            except AccessDenied:
                continue
        if not processes:
            return False
        return await self.request_prompt(
            f"{app.id.key()}-{port}",
            {
                "kind": "http/port",
                "id": self.get_next_request_id(),
                "app": app.to_json(),
                "processes": processes,
            },
        )

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
                f"Dashboard {self.dashboard_session} tried to {'approve' if response['ok'] else 'deny'} "
                f"to unknown request {response['request_id']} with"
            )
            logger.warning(msg)
            return
        request.set_result(response)

    async def handle_drag_drop_request(self, session: Session, request: DragDropRequest) -> DragDropRequestResponse:
        dashboard = await self.wait_dashboard_ready()
        request_id = self.get_next_request_id()
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
        request_id = self.get_next_request_id()
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

    def get_next_request_id(self) -> str:
        self.request_id += 1
        return f"{self.request_id}-{time.time_ns()}"

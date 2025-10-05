from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, NotRequired, TypedDict

from omu.api.endpoint.endpoint import EndpointType
from omu.api.extension import Extension, ExtensionType
from omu.api.table.table import TablePermissions, TableType
from omu.app import App
from omu.helper import Coro
from omu.identifier import Identifier
from omu.localization.locale import Locale
from omu.localization.localization import LocalizedText
from omu.network.packet import PacketType
from omu.omu import Omu
from omu.serializer import Serializer

SESSION_EXTENSION_TYPE = ExtensionType("sessions", lambda client: SessionExtension(client))
SESSIONS_READ_PERMISSION_ID = SESSION_EXTENSION_TYPE / "read"

SESSION_TABLE_TYPE = TableType.create_model(
    SESSION_EXTENSION_TYPE,
    "sessions",
    App,
    permissions=TablePermissions(
        read=SESSIONS_READ_PERMISSION_ID,
    ),
)

SESSION_OBSERVE_PACKET_TYPE = PacketType[list[Identifier]].create_json(
    SESSION_EXTENSION_TYPE,
    "observe",
    serializer=Serializer.model(Identifier).to_array(),
)
SESSION_CONNECTED_PACKET_TYPE = PacketType[App].create_json(
    SESSION_EXTENSION_TYPE,
    "session_connected",
    serializer=Serializer.model(App),
)
SESSION_DISCONNECTED_PACKET_TYPE = PacketType[App].create_json(
    SESSION_EXTENSION_TYPE,
    "session_disconnected",
    serializer=Serializer.model(App),
)


class RemoteAppMetadata(TypedDict):
    locale: Locale
    name: NotRequired[LocalizedText | None]
    icon: NotRequired[LocalizedText | None]
    description: NotRequired[LocalizedText | None]


class RemoteAppRequestPayload(TypedDict):
    id: str
    url: str
    metadata: RemoteAppMetadata
    permissions: list[str]


class RequestRemoteAppResponseOk(TypedDict):
    type: Literal["success"]
    token: str
    lan_ip: str


class RequestRemoteAppResponseError(TypedDict):
    type: Literal["error"]
    message: str


type RequestRemoteAppResponse = RequestRemoteAppResponseOk | RequestRemoteAppResponseError

REMOTE_APP_REQUEST_PERMISSION_ID = SESSION_EXTENSION_TYPE / "remote_app" / "request"
REMOTE_APP_REQUEST_ENDPOINT_TYPE = EndpointType[RemoteAppRequestPayload, RequestRemoteAppResponse].create_json(
    SESSION_EXTENSION_TYPE,
    "remote_app_request",
    permission_id=REMOTE_APP_REQUEST_PERMISSION_ID,
)
SESSION_REQUIRE_PACKET_TYPE = PacketType[list[Identifier]].create_json(
    SESSION_EXTENSION_TYPE,
    "require",
    serializer=Serializer.model(Identifier).to_array(),
)


class SessionExtension(Extension):
    @property
    def type(self):
        return SESSION_EXTENSION_TYPE

    def __init__(self, omu: Omu):
        self.omu = omu
        omu.network.register_packet(
            SESSION_REQUIRE_PACKET_TYPE,
            SESSION_OBSERVE_PACKET_TYPE,
            SESSION_CONNECTED_PACKET_TYPE,
            SESSION_DISCONNECTED_PACKET_TYPE,
        )
        omu.network.add_packet_handler(SESSION_CONNECTED_PACKET_TYPE, self.handle_session_connect)
        omu.network.add_packet_handler(SESSION_DISCONNECTED_PACKET_TYPE, self.handle_session_disconnect)
        self.session_observers: dict[Identifier, SessionObserver] = {}
        self.required_apps: set[Identifier] = set()
        omu.network.add_task(self.on_task)
        omu.on_ready(self.on_ready)

    async def on_ready(self) -> None:
        if self.session_observers:
            await self.omu.send(SESSION_OBSERVE_PACKET_TYPE, [*self.session_observers])

    async def on_task(self) -> None:
        if self.required_apps:
            await self.omu.send(SESSION_REQUIRE_PACKET_TYPE, [*self.required_apps])

    def require(self, *app_ids: Identifier) -> None:
        if self.omu.running:
            raise RuntimeError("Cannot require apps after the client has started")
        self.required_apps.update(app_ids)

    async def handle_session_connect(self, app: App) -> None:
        observer = self.session_observers.get(app.id)
        if observer is None:
            return
        for callback in observer.on_connect_callbacks:
            await callback(app)

    async def handle_session_disconnect(self, app: App) -> None:
        observer = self.session_observers.get(app.id)
        if observer is None:
            return
        for callback in observer.on_disconnect_callbacks:
            await callback(app)

    def observe_session(
        self,
        app_id: Identifier,
        on_connect: Coro[[App], None] | None = None,
        on_disconnect: Coro[[App], None] | None = None,
    ) -> SessionObserver:
        if self.omu.running:
            raise RuntimeError("Cannot require apps after the client has started")
        observer = self.session_observers.get(app_id) or SessionObserver()
        if on_connect:
            observer.on_connect(on_connect)
        if on_disconnect:
            observer.on_disconnect(on_disconnect)
        self.session_observers[app_id] = observer
        return observer


@dataclass(frozen=True, slots=True)
class SessionObserver:
    on_connect_callbacks: list[Coro[[App], None]] = field(default_factory=list)
    on_disconnect_callbacks: list[Coro[[App], None]] = field(default_factory=list)

    def on_connect(self, coro: Coro[[App], None]) -> Coro[[App], None]:
        self.on_connect_callbacks.append(coro)
        return coro

    def on_disconnect(self, coro: Coro[[App], None]) -> Coro[[App], None]:
        self.on_disconnect_callbacks.append(coro)
        return coro

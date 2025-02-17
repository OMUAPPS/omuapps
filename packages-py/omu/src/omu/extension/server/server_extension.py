from __future__ import annotations

from dataclasses import dataclass, field

from omu.app import App
from omu.client import Client
from omu.extension import Extension, ExtensionType
from omu.extension.endpoint import EndpointType
from omu.extension.registry import RegistryPermissions, RegistryType
from omu.extension.table import TablePermissions, TableType
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.serializer import Serializer

SERVER_EXTENSION_TYPE = ExtensionType("server", lambda client: ServerExtension(client), lambda: [])

SERVER_APPS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE / "apps" / "read"
SERVER_APP_TABLE_TYPE = TableType.create_model(
    SERVER_EXTENSION_TYPE,
    "apps",
    App,
    permissions=TablePermissions(
        read=SERVER_APPS_READ_PERMISSION_ID,
    ),
)
SERVER_SESSIONS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE / "sessions" / "read"
SERVER_SESSION_TABLE_TYPE = TableType.create_model(
    SERVER_EXTENSION_TYPE,
    "sessions",
    App,
    permissions=TablePermissions(
        read=SERVER_SESSIONS_READ_PERMISSION_ID,
    ),
)
SERVER_SHUTDOWN_PERMISSION_ID = SERVER_EXTENSION_TYPE / "shutdown"
SHUTDOWN_ENDPOINT_TYPE = EndpointType[bool, bool].create_json(
    SERVER_EXTENSION_TYPE,
    "shutdown",
    permission_id=SERVER_SHUTDOWN_PERMISSION_ID,
)
REQUIRE_APPS_PACKET_TYPE = PacketType[list[Identifier]].create_json(
    SERVER_EXTENSION_TYPE,
    "require_apps",
    serializer=Serializer.model(Identifier).to_array(),
)
TRUSTED_ORIGINS_GET_PERMISSION_ID = SERVER_EXTENSION_TYPE / "trusted_origins" / "get"
TRUSTED_ORIGINS_SET_PERMISSION_ID = SERVER_EXTENSION_TYPE / "trusted_origins" / "set"
TRUSTED_ORIGINS_REGISTRY_TYPE = RegistryType[list[str]].create_json(
    SERVER_EXTENSION_TYPE,
    "trusted_origins",
    default_value=[],
    permissions=RegistryPermissions(
        read=TRUSTED_ORIGINS_GET_PERMISSION_ID,
        write=TRUSTED_ORIGINS_SET_PERMISSION_ID,
    ),
)
SESSION_OBSERVE_PACKET_TYPE = PacketType[list[Identifier]].create_json(
    SERVER_EXTENSION_TYPE,
    "session_observe",
    serializer=Serializer.model(Identifier).to_array(),
)
SESSION_CONNECT_PACKET_TYPE = PacketType[App].create_json(
    SERVER_EXTENSION_TYPE,
    "session_connect",
    serializer=Serializer.model(App),
)
SESSION_DISCONNECT_PACKET_TYPE = PacketType[App].create_json(
    SERVER_EXTENSION_TYPE,
    "session_disconnect",
    serializer=Serializer.model(App),
)


class ServerExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return SERVER_EXTENSION_TYPE

    def __init__(self, client: Client) -> None:
        self._client = client
        self.apps = client.tables.get(SERVER_APP_TABLE_TYPE)
        self.sessions = client.tables.get(SERVER_APP_TABLE_TYPE)
        self.required_apps: set[Identifier] = set()
        self.trusted_origins = client.registries.get(TRUSTED_ORIGINS_REGISTRY_TYPE)
        self.session_observers: dict[Identifier, SessionObserver] = {}
        client.network.register_packet(
            REQUIRE_APPS_PACKET_TYPE,
            SESSION_OBSERVE_PACKET_TYPE,
            SESSION_CONNECT_PACKET_TYPE,
            SESSION_DISCONNECT_PACKET_TYPE,
        )
        client.network.add_packet_handler(SESSION_CONNECT_PACKET_TYPE, self.handle_session_connect)
        client.network.add_packet_handler(SESSION_DISCONNECT_PACKET_TYPE, self.handle_session_disconnect)
        client.network.add_task(self.on_task)
        client.on_ready(self.on_ready)

    async def on_task(self) -> None:
        if self.required_apps:
            await self._client.send(REQUIRE_APPS_PACKET_TYPE, [*self.required_apps])

    async def on_ready(self) -> None:
        if self.session_observers:
            await self._client.send(SESSION_OBSERVE_PACKET_TYPE, [*self.session_observers])

    async def shutdown(self, restart: bool = False) -> bool:
        return await self._client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart)

    def observe_session(
        self,
        app_id: Identifier,
        on_connect: Coro[[App], None] | None = None,
        on_disconnect: Coro[[App], None] | None = None,
    ) -> SessionObserver:
        if self._client.running:
            raise RuntimeError("Cannot require apps after the client has started")
        observer = self.session_observers.get(app_id) or SessionObserver()
        if on_connect:
            observer.on_connect(on_connect)
        if on_disconnect:
            observer.on_disconnect(on_disconnect)
        self.session_observers[app_id] = observer
        return observer

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

    def require(self, *app_ids: Identifier) -> None:
        if self._client.running:
            raise RuntimeError("Cannot require apps after the client has started")
        self.required_apps.update(app_ids)


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

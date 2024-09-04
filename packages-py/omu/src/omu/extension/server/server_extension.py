from omu.app import App
from omu.client import Client
from omu.extension import Extension, ExtensionType
from omu.extension.endpoint import EndpointType
from omu.extension.registry import RegistryPermissions, RegistryType
from omu.extension.table import TablePermissions, TableType
from omu.identifier import Identifier
from omu.network.packet import PacketType
from omu.serializer import Serializer

SERVER_EXTENSION_TYPE = ExtensionType(
    "server", lambda client: ServerExtension(client), lambda: []
)

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


class ServerExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return SERVER_EXTENSION_TYPE

    def __init__(self, client: Client) -> None:
        self._client = client
        self.apps = client.tables.get(SERVER_APP_TABLE_TYPE)
        self.sessions = client.tables.get(SERVER_APP_TABLE_TYPE)
        self.required_apps: set[Identifier] = set()
        self.trusted_origins = client.registry.get(TRUSTED_ORIGINS_REGISTRY_TYPE)
        client.network.register_packet(REQUIRE_APPS_PACKET_TYPE)
        client.network.add_task(self.on_task)

    async def on_task(self) -> None:
        if self.required_apps:
            await self._client.send(REQUIRE_APPS_PACKET_TYPE, [*self.required_apps])

    async def shutdown(self, restart: bool = False) -> bool:
        return await self._client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart)

    def require(self, *app_ids: Identifier) -> None:
        if self._client.running:
            raise RuntimeError("Cannot require apps after the client has started")
        self.required_apps.update(app_ids)

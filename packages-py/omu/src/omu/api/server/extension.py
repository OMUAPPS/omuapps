from __future__ import annotations

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.api.registry import RegistryPermissions, RegistryType
from omu.api.table import TablePermissions, TableType
from omu.app import App
from omu.omu import Omu

SERVER_EXTENSION_TYPE = ExtensionType("server", lambda client: ServerExtension(client))

SERVER_APPS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE / "apps" / "read"
SERVER_APP_TABLE_TYPE = TableType.create_model(
    SERVER_EXTENSION_TYPE,
    "apps",
    App,
    permissions=TablePermissions(
        read=SERVER_APPS_READ_PERMISSION_ID,
    ),
)
SERVER_SHUTDOWN_PERMISSION_ID = SERVER_EXTENSION_TYPE / "shutdown"
SHUTDOWN_ENDPOINT_TYPE = EndpointType[bool, bool].create_json(
    SERVER_EXTENSION_TYPE,
    "shutdown",
    permission_id=SERVER_SHUTDOWN_PERMISSION_ID,
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

    def __init__(self, omu: Omu) -> None:
        self._client = omu
        self.apps = omu.tables.get(SERVER_APP_TABLE_TYPE)
        self.sessions = omu.tables.get(SERVER_APP_TABLE_TYPE)
        self.trusted_origins = omu.registries.get(TRUSTED_ORIGINS_REGISTRY_TYPE)

    async def shutdown(self, restart: bool = False) -> bool:
        return await self._client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart)

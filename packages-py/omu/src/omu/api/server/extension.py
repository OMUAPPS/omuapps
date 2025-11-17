from __future__ import annotations

from typing import NotRequired, TypedDict

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.api.registry import RegistryType
from omu.api.registry.registry import RegistryPermissions
from omu.api.table import TablePermissions, TableType
from omu.app import App
from omu.localization.localization import LocalizedText
from omu.omu import Omu

SERVER_EXTENSION_TYPE = ExtensionType("server", lambda client: ServerExtension(client))


class AppIndexRegistryMeta(TypedDict):
    name: LocalizedText
    note: LocalizedText


class AppIndexEntry(TypedDict):
    url: str
    meta: NotRequired[AppIndexRegistryMeta]
    added_at: str


class AppIndex(TypedDict):
    indexes: dict[str, AppIndexEntry]


SERVER_APPS_WRITE_PERMISSION_ID = SERVER_EXTENSION_TYPE / "apps" / "write"
SERVER_APPS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE / "apps" / "read"
SERVER_INDEX_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE / "index" / "read"
SERVER_INDEX_REGISTRY_TYPE = RegistryType[AppIndex].create_json(
    SERVER_EXTENSION_TYPE,
    "index",
    default_value={"indexes": {}},
    permissions=RegistryPermissions(
        write=SERVER_APPS_WRITE_PERMISSION_ID,
        read=SERVER_INDEX_READ_PERMISSION_ID,
    ),
)
SERVER_APP_TABLE_TYPE = TableType.create_model(
    SERVER_EXTENSION_TYPE,
    "apps",
    App,
    permissions=TablePermissions(
        all=SERVER_APPS_WRITE_PERMISSION_ID,
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
TRUSTED_HOSTS_REGISTRY_TYPE = RegistryType[dict[str, str]].create_json(
    SERVER_EXTENSION_TYPE,
    "trusted_hosts",
    default_value={},
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
        self.index = omu.registries.get(SERVER_INDEX_REGISTRY_TYPE)
        self.sessions = omu.tables.get(SERVER_APP_TABLE_TYPE)
        self.trusted_origins = omu.registries.get(TRUSTED_HOSTS_REGISTRY_TYPE)

    async def shutdown(self, restart: bool = False) -> bool:
        return await self._client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart)

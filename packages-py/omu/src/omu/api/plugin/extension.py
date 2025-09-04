from typing import TypedDict

from omu.api import Extension, ExtensionType
from omu.api.endpoint import EndpointType
from omu.api.table import TableType
from omu.api.table.table import TablePermissions
from omu.client import Client
from omu.network.packet import PacketType

from .plugin import PluginPackageInfo

PLUGIN_EXTENSION_TYPE = ExtensionType(
    "plugin",
    lambda client: PluginExtension(client),
    lambda: [],
)


class PluginExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return PLUGIN_EXTENSION_TYPE

    def __init__(self, client: Client):
        self.client = client
        self.plugins: dict[str, str | None] = {}

        self.client.network.register_packet(
            PLUGIN_REQUIRE_PACKET,
        )
        self.client.network.add_task(self.on_task)

    async def on_task(self):
        await self.client.send(PLUGIN_REQUIRE_PACKET, self.plugins)

    def require(self, plugins: dict[str, str | None]):
        if self.client.running:
            raise RuntimeError("Cannot require plugins after client has started")
        self.plugins.update(plugins)


PLUGIN_REQUIRE_PACKET = PacketType[dict[str, str | None]].create_json(
    PLUGIN_EXTENSION_TYPE,
    "require",
)
PLUGIN_READ_PACKAGE_PERMISSION_ID = PLUGIN_EXTENSION_TYPE.join("package", "read")
PLUGIN_MANAGE_PACKAGE_PERMISSION_ID = PLUGIN_EXTENSION_TYPE.join("package", "manage")
PLUGIN_ALLOWED_PACKAGE_TABLE = TableType.create_model(
    PLUGIN_EXTENSION_TYPE,
    "allowed_package",
    PluginPackageInfo,
    permissions=TablePermissions(
        read=PLUGIN_READ_PACKAGE_PERMISSION_ID,
    ),
)


class ReloadOptions(TypedDict):
    packages: list[str] | None


class ReloadResult(TypedDict):
    packages: dict[str, str]


PLUGIN_RELOAD_ENDPOINT_TYPE = EndpointType[ReloadOptions, ReloadResult].create_json(
    PLUGIN_EXTENSION_TYPE,
    name="reload",
    permission_id=PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
)

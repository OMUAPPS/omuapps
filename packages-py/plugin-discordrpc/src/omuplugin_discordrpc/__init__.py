from omu import Plugin
from omuserver import Server

from .permissions import (
    DISCORDRPC_CHANNEL_READ_PERMISSION_TYPE,
    DISCORDRPC_GUILD_READ_PERMISSION_TYPE,
    DISCORDRPC_VC_READ_PERMISSION_TYPE,
    DISCORDRPC_VC_SET_PERMISSION_TYPE,
)
from .plugin import omu
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


async def on_start_server(server: Server):
    server.permission_manager.register(
        DISCORDRPC_VC_READ_PERMISSION_TYPE,
        DISCORDRPC_VC_SET_PERMISSION_TYPE,
        DISCORDRPC_GUILD_READ_PERMISSION_TYPE,
        DISCORDRPC_CHANNEL_READ_PERMISSION_TYPE,
    )


plugin = Plugin(
    on_start_server=on_start_server,
    get_client=lambda: omu,
)

from omu.plugin import InstallContext, Plugin
from omuserver.server import Server

from .permissions import PERMISSION_TYPES
from .plugin import ensure_obs_stop, install, relaunch_obs
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


async def on_start_server(server: Server) -> None:
    await install()
    server.permission_manager.register(*PERMISSION_TYPES)


async def on_install(ctx: InstallContext) -> None:
    await install()
    ensure_obs_stop()
    relaunch_obs()


async def on_update(ctx: InstallContext) -> None:
    ctx.server.permission_manager.unregister(*PERMISSION_TYPES)


plugin = Plugin(
    on_start_server=on_start_server,
    on_install=on_install,
    on_update=on_update,
)

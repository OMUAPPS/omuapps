from omu.plugin import InstallContext, Plugin
from omuserver.server import Server

from .permissions import PERMISSION_TYPES
from .plugin import ensure_obs_stop, install, relaunch_obs
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


async def on_start_server(server: Server) -> None:
    await install(server)
    server.security.register(
        *PERMISSION_TYPES,
        overwrite=True,
    )


async def on_install(ctx: InstallContext) -> None:
    await install(ctx.server)
    ensure_obs_stop()
    relaunch_obs()


plugin = Plugin(
    on_start=on_start_server,
    on_install=on_install,
    isolated=False,
)

from loguru import logger
from omu.plugin import InstallContext, Plugin
from omuserver.server import Server

from .permissions import PERMISSION_TYPES
from .plugin import install
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


async def on_start(server: Server) -> None:
    logger.info("Starting OBS plugin")
    await install(server)
    server.security.register(
        *PERMISSION_TYPES,
        overwrite=True,
    )


async def on_install(ctx: InstallContext) -> None:
    await on_start(ctx.server)


plugin = Plugin(
    on_start=on_start,
    on_install=on_install,
    isolated=False,
)

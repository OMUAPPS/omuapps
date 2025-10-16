import threading

from loguru import logger
from omu.plugin import InstallContext, Plugin
from omuserver.server import Server

from .permissions import PERMISSION_TYPES
from .plugin import install
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]
global install_thread
install_thread: threading.Thread | None = None


def install_start(server: Server) -> None:
    global install_thread
    if install_thread and install_thread.is_alive():
        raise RuntimeError("Installation thread is already running")
    logger.info("Starting installation thread")
    install_thread = threading.Thread(target=install, args=(server,))
    install_thread.start()


async def on_start(server: Server) -> None:
    logger.info("Starting OBS plugin")
    server.security.register_permission(
        *PERMISSION_TYPES,
        overwrite=True,
    )
    install_start(server)


async def on_install(ctx: InstallContext) -> None:
    await on_start(ctx.server)


plugin = Plugin(
    on_start=on_start,
    on_install=on_install,
    isolated=False,
)

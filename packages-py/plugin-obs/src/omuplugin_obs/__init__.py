import threading

from loguru import logger
from omu.plugin import InstallContext, Plugin, StartContext
from omuserver.server import Server

from .permissions import PERMISSION_TYPES
from .plugin import install, uninstall
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


async def plugin_install(ctx: StartContext | InstallContext) -> None:
    logger.info("Installing OBS plugin")
    ctx.server.security.register_permission(
        *PERMISSION_TYPES,
        overwrite=True,
    )
    install_start(ctx.server)


plugin = Plugin(
    on_start=plugin_install,
    on_install=plugin_install,
    on_uninstall=uninstall,
    isolated=False,
)

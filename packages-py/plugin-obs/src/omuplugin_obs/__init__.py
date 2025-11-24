import threading

from loguru import logger
from omu.plugin import Plugin, PluginContext
from omuserver.server import Server
from omuserver.session import Session

from omuplugin_obs.config import Config
from omuplugin_obs.types import (
    CHECK_INSTALLED_ENDPOINT_TYPE,
    SET_INSTALL_ENDPOINT_TYPE,
    InstallationStatus,
    InstallRequest,
)

from .permissions import PERMISSION_TYPES
from .plugin import check_installed, install, uninstall, update_config
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]
global install_thread
install_thread: threading.Thread | None = None


async def start(ctx: PluginContext):
    server = ctx.server
    await update(server)

    async def obs_check_installed(session: Session, _) -> InstallationStatus:
        installed = check_installed()
        config = Config.load().unwrap()
        return {
            "script_installed": installed.is_ok,
            "launch_installed": config.json.get("launch") is not None,
        }

    async def obs_set_install(session: Session, request: InstallRequest):
        config = Config.load().unwrap()
        if request["launch_active"]:
            config.set_launch(server)
        else:
            config.unset_launch()
        config.store()

        if request["script_active"]:
            installed = check_installed()
            if installed.is_ok is True:
                logger.info("OBS plugin is already installed")
                return
            logger.warning(f"OBS plugin is not installed: {installed.err}")
            install()
        else:
            uninstall(server)

    server.endpoints.bind(CHECK_INSTALLED_ENDPOINT_TYPE, obs_check_installed)
    server.endpoints.bind(SET_INSTALL_ENDPOINT_TYPE, obs_set_install)


async def update(server: Server) -> None:
    logger.info("Updating OBS plugin config")
    server.security.register_permission(
        *PERMISSION_TYPES,
        overwrite=True,
    )
    update_config(server)


async def on_uninstall(ctx: PluginContext):
    uninstall(ctx.server)


plugin = Plugin(
    on_start=start,
    on_install=lambda ctx: update(ctx.server),
    on_uninstall=on_uninstall,
    isolated=False,
)

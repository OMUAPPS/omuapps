if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


import subprocess

from loguru import logger
from omuplugin_obs.script import obsplugin
from omuplugin_obs.script.config import LaunchCommand, get_config, setup_logger

setup_logger()


def get_launch_command() -> LaunchCommand | None:
    return get_config().get("launch")


def launch_server():
    launch_command = get_launch_command()
    if launch_command is None:
        logger.info("No launch command found. Skipping")
        return
    startup_info = subprocess.STARTUPINFO()
    startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    process = subprocess.Popen(
        **launch_command,
        startupinfo=startup_info,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    logger.info(f"Launched dashboard with PID {process.pid} using command {launch_command}")


def script_load(settings):
    launch_server()
    obsplugin.script_load()


def script_unload():
    obsplugin.script_unload()


def script_description():
    return "OMUAPPS Plugin"

if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


import subprocess
from pathlib import Path

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

    args = launch_command["args"]
    if not args:
        logger.error("No arguments provided in launch command")
        return
    executable = args.pop(0)
    if not Path(executable).exists():
        logger.error(f"Executable {executable} does not exist")
        return
    if not Path(executable).is_file():
        logger.error(f"Executable {executable} is not a file")
        return
    if not Path(executable).is_absolute():
        logger.warning(f"Executable {executable} is not an absolute path")

    process = subprocess.Popen(
        [executable, *args],
        cwd=launch_command.get("cwd"),
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

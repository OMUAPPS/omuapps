if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


import json
import subprocess

from loguru import logger
from omuplugin_obs.script import obsplugin
from omuplugin_obs.script.config import get_config_path, get_log_path

log_path = get_log_path()
logger.remove()
logger.add(
    f"{log_path}/{{time}}.log",
    colorize=False,
    format=("{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | " "{name}:{function}:{line} - {message}"),
    retention="7 days",
    compression="zip",
)


def get_launch_command():
    return json.loads(get_config_path().read_text(encoding="utf-8"))["launch"]


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
    logger.info(f"Launched {process.pid}")


def script_load(settings):
    launch_server()
    obsplugin.script_load()


def script_unload():
    obsplugin.script_unload()


def script_description():
    return "OMUAPPS Plugin"

import sys

if __name__ == "omuapps_plugin":
    import find_venv  # type: ignore

    print(find_venv.find_venv())
    print(sys.path)

try:
    from loguru import logger
except ImportError:
    import logging

    logger = logging.getLogger(__name__)
    logger.warning("Loguru not found, using logging module")

import json
import subprocess
from pathlib import Path


class g:
    process: subprocess.Popen | None = None


def get_launch_command():
    config_path = Path(__file__).parent / "config.json"
    return json.loads(config_path.read_text(encoding="utf-8"))


def launch():
    if g.process:
        kill()
    startup_info = subprocess.STARTUPINFO()
    startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    g.process = subprocess.Popen(
        **get_launch_command(),
        startupinfo=startup_info,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    print("Launched")


def kill():
    if g.process:
        g.process.kill()
        g.process = None
        print("Killed")


def script_load(settings):
    launch()
    logger.info("OMUAPPS Plugin loaded")


def script_unload():
    kill()


def script_description():
    return "OMUAPPS Plugin"

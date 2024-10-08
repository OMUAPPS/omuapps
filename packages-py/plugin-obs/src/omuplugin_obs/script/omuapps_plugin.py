if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


import json
import subprocess
from threading import Thread

from omuplugin_obs.script.config import get_config_path


class g:
    process: subprocess.Popen | None = None


def get_launch_command():
    return json.loads(get_config_path().read_text(encoding="utf-8"))["launch"]


def launch_server():
    if g.process:
        terminate_server()
    startup_info = subprocess.STARTUPINFO()
    startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    g.process = subprocess.Popen(
        **get_launch_command(),
        startupinfo=startup_info,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )


def terminate_server():
    if g.process:
        g.process.kill()
        g.process = None
        print("Killed")


def script_load(settings):
    thread = Thread(target=start, daemon=True)
    thread.start()


def start():
    launch_server()
    from omuplugin_obs.script import obsplugin

    obsplugin.start()


def script_unload():
    from omuplugin_obs.script import obsplugin

    obsplugin.stop()


def script_description():
    return "OMUAPPS Plugin"

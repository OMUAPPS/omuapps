if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


import json
import subprocess
from pathlib import Path
from threading import Thread

from ..obs.property import OBSProperties, OBSProperty


class g:
    process: subprocess.Popen | None = None


def get_launch_command():
    config_path = Path(__file__).parent / "config.json"
    return json.loads(config_path.read_text(encoding="utf-8"))


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


def test(props: OBSProperties, prop: OBSProperty): ...


def script_properties():  # ui
    props = OBSProperties.create()
    props.add_button("button", "Test", test)
    return props.acquire()


def start_plugin():
    from omuplugin_obs.script import obsplugin

    obsplugin.start()


def script_load(settings):
    thread = Thread(target=start, daemon=True)
    thread.start()


def start():
    launch_server()
    start_plugin()


def script_unload():
    terminate_server()


def script_description():
    return "OMUAPPS Plugin"

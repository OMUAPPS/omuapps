if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import debug  # type: ignore

    debug.init()

try:
    from loguru import logger
except ImportError:
    import logging

    logger = logging.getLogger(__name__)
    logger.warning("Loguru not found, using logging module")

import json
import subprocess
from pathlib import Path
from threading import Thread

from omuobs.data import OBSData
from omuobs.obs import OBS
from omuobs.property import OBSProperties, OBSProperty
from omuobs.scene import OBSScene
from omuobs.source import OBSSource


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


def test(props: OBSProperties, prop: OBSProperty):
    OBS.frontend_get_current_scene()
    for source in OBS.get_scenes():
        print(source.source.name)
    test_scene = OBSScene.get_scene_by_name("test")
    if test_scene is None:
        test_scene = OBSScene.create("test")
    obs_data = OBSData.create()
    obs_data.set_string("url", "https://www.google.com")
    obs_data.set_int("width", 1920)
    obs_data.set_int("height", 1080)
    browser = OBSSource.create("browser_source", "browser2", obs_data)
    test_scene.add(browser)


def test2(props: OBSProperties, prop: OBSProperty):
    scene = OBS.frontend_get_current_scene().scene
    for source in scene.enum_items():
        print(source.source.name)


def script_properties():  # ui
    props = OBSProperties.create()
    props.add_button("button", "Add text source", test)
    props.add_button("button2", "Test2", test2)
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

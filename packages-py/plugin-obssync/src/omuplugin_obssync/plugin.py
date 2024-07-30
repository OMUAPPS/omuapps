from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from threading import Thread
from typing import Any, TypedDict

import psutil
from omu.identifier import Identifier
from omuserver.server import Server

IDENTIFIER = Identifier("com.omuapps", "plugin-obssync")


class obs:
    launch_command: list[str] | None = None
    cwd: Path | None = None


def kill_obs():
    for proc in psutil.process_iter():
        if proc.name() == "obs":
            obs.launch_command = proc.cmdline()
            obs.cwd = Path(proc.cwd())
            proc.kill()


def launch_obs():
    if obs.launch_command:
        subprocess.Popen(obs.launch_command, cwd=obs.cwd)


class ScriptToolJson(TypedDict):
    path: str
    settings: Any


ModulesJson = TypedDict("ModulesJson", {"scripts-tool": list[ScriptToolJson]})


def get_launch_command():
    import os
    import sys

    return {
        "cwd": os.getcwd(),
        "args": [sys.executable, "-m", "omuserver", *sys.argv[1:]],
    }


def generate_launcher_code():
    return f"""\
import subprocess
class g:
    process: subprocess.Popen | None = None

def _launch():
    if g.process:
        _kill()
    g.process = subprocess.Popen(**{get_launch_command()})
    print("Launched")

def _kill():
    if g.process:
        g.process.kill()
        g.process = None
        print("Killed")

# obs
def script_load(settings):
    _launch()

def script_unload():
    _kill()
"""


def get_obs_path():
    if sys.platform == "win32":
        APP_DATA = os.getenv("APPDATA")
        if not APP_DATA:
            raise Exception("APPDATA not found")
        return Path(APP_DATA) / "obs-studio"
    else:
        return Path("~/.config/obs-studio").expanduser()


def install(launcher: Path, scene: Path):
    data: SceneJson = json.loads(scene.read_text(encoding="utf-8"))
    if "modules" not in data:
        data["modules"] = {}
    if "scripts-tool" not in data["modules"]:
        data["modules"]["scripts-tool"] = []
    if any(str(launcher) == x["path"] for x in data["modules"]["scripts-tool"]):
        return
    data["modules"]["scripts-tool"].append({"path": str(launcher), "settings": {}})
    scene.write_text(json.dumps(data), encoding="utf-8")


def install_all_scene():
    obs_path = get_obs_path()
    scenes_path = obs_path / "basic" / "scenes"
    launcher_path = obs_path / "run_omuserver.py"
    launcher_path.write_text(generate_launcher_code())
    for scene in scenes_path.glob("*.json"):
        install(launcher_path, scene)


class SceneJson(TypedDict):
    modules: ModulesJson


async def on_start_server(server: Server) -> None:
    thread = Thread(target=sync_obs_scenes)
    thread.start()


def sync_obs_scenes():
    kill_obs()
    install_all_scene()
    launch_obs()

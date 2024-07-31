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

from .obsconfig import OBSConfig

IDENTIFIER = Identifier("com.omuapps", "plugin-obssync")


class obs:
    launch_command: list[str] | None = None
    cwd: Path | None = None


def kill_obs():
    for proc in psutil.process_iter():
        name = proc.name()
        if name in {"obs64.exe", "obs32.exe"}:
            obs.launch_command = proc.cmdline()
            obs.cwd = Path(proc.cwd())
            proc.terminate()


def relaunch_obs():
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


def get_obs_path():
    if sys.platform == "win32":
        APP_DATA = os.getenv("APPDATA")
        if not APP_DATA:
            raise Exception("APPDATA not found")
        return Path(APP_DATA) / "obs-studio"
    else:
        return Path("~/.config/obs-studio").expanduser()


def install_script(launcher: Path, scene: Path) -> bool:
    data: SceneJson = json.loads(scene.read_text(encoding="utf-8"))
    if "modules" not in data:
        data["modules"] = {}
    if "scripts-tool" not in data["modules"]:
        data["modules"]["scripts-tool"] = []
    if any(str(launcher) == x["path"] for x in data["modules"]["scripts-tool"]):
        return False
    data["modules"]["scripts-tool"].append({"path": str(launcher), "settings": {}})
    scene.write_text(json.dumps(data), encoding="utf-8")
    return True


def install_all_scene() -> bool:
    obs_path = get_obs_path()
    scenes_path = obs_path / "basic" / "scenes"
    launcher_path = Path(__file__).parent / "script" / "omuapps_plugin.py"
    config_path = Path(__file__).parent / "script" / "config.json"
    config_path.write_text(json.dumps(get_launch_command()), encoding="utf-8")
    should_launch = False
    for scene in scenes_path.glob("*.json"):
        should_launch |= install_script(launcher_path, scene)
    return should_launch


def setup_python_path() -> bool:
    path = get_obs_path() / "global.ini"
    text = path.read_text(encoding="utf-8-sig")
    config = OBSConfig.loads(text)

    if "Python" not in config:
        config["Python"] = {}
    python = config["Python"]
    python_path = get_python_directory()

    if python.get("Path32bit") == python.get("Path64bit") == python_path:
        return False

    kill_obs()
    text = path.read_text(encoding="utf-8-sig")
    config = OBSConfig.loads(text)
    python["Path64bit"] = python_path
    python["Path32bit"] = python_path
    path.write_text(OBSConfig.dumps(config), encoding="utf-8-sig")
    return True


def is_venv():
    return hasattr(sys, "real_prefix") or (
        hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix
    )


def get_python_directory():
    version_string = f"cpython@{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    rye_dir = Path.home() / ".rye" / "py" / version_string
    if is_venv() and rye_dir.exists():
        return str(rye_dir)

    path = Path(sys.executable)
    return str(path.parent.parent).replace("\\\\", "\\").replace("\\", "/")


def install():
    should_relaunch = setup_python_path()
    should_relaunch |= install_all_scene()
    relaunch_obs()


class SceneJson(TypedDict):
    modules: ModulesJson


async def on_start_server(server: Server) -> None:
    thread = Thread(target=install)
    thread.start()

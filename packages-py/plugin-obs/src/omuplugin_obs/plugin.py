from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tkinter
from pathlib import Path
from threading import Thread
from tkinter import messagebox
from typing import Any, TypedDict

import psutil
from omu.identifier import Identifier
from omuserver.server import Server

from . import obsconfig
from .permissions import PERMISSION_TYPES

IDENTIFIER = Identifier("com.omuapps", "plugin-obssync")


class obs:
    launch_command: list[str] | None = None
    cwd: Path | None = None


def kill_obs():
    process = find_process({"obs64.exe", "obs32.exe"})
    if not process:
        return
    obs.launch_command = process.cmdline()
    obs.cwd = Path(process.cwd())

    root = tkinter.Tk()
    root.withdraw()

    def update():
        if process.is_running():
            root.after(200, update)
        else:
            root.destroy()

    root.after(200, update)

    message = messagebox.Message(
        root,
        title="OMUAPPS OBSプラグイン",
        message="導入をするには一度OBSを再起動する必要があります。再起動しますか？",
        icon=messagebox.WARNING,
        type=messagebox.YESNO,
    )
    res = message.show()
    if not res:
        return
    if res == messagebox.YES:
        terminate_obs(process)
    else:
        raise Exception("TODO: implement")
    while process.is_running():
        message = messagebox.Message(
            root,
            title="OMUAPPS OBSプラグイン",
            message="OBSを終了しています。終了しない場合は手動で終了してください。",
            icon=messagebox.WARNING,
            type=messagebox.RETRYCANCEL,
        )
        res = message.show()
        if not res:
            return
        if res == messagebox.CANCEL:
            raise Exception("TODO: implement")


def terminate_obs(process: psutil.Process):
    if sys.platform == "win32":
        from .hwnd_helpers import close_process_window

        close_process_window(process)
    elif sys.platform == "linux":
        process.send_signal(signal.SIGINT)
    elif sys.platform == "darwin":
        process.send_signal(signal.SIGINT)
    else:
        raise Exception(f"Unsupported platform: {sys.platform}")


def find_process(names: set[str]) -> psutil.Process | None:
    for proc in psutil.process_iter():
        name = proc.name()
        if name in names:
            return proc
    return None


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
    if any(Path(launcher) == Path(x["path"]) for x in data["modules"]["scripts-tool"]):
        return False
    new_script_path = str(launcher)
    data["modules"]["scripts-tool"].append({"path": new_script_path, "settings": {}})
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
    config = obsconfig.loads(text)

    if "Python" not in config:
        config["Python"] = {}
    python = config["Python"]
    python_path = get_python_directory()

    if python.get("Path32bit") == python.get("Path64bit") == python_path:
        return False

    kill_obs()
    text = path.read_text(encoding="utf-8-sig")
    config = obsconfig.loads(text)
    python["Path64bit"] = python_path
    python["Path32bit"] = python_path
    path.write_text(obsconfig.dumps(config), encoding="utf-8-sig")
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
    server.permission_manager.register(*PERMISSION_TYPES)

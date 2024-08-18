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
from loguru import logger
from omuserver.server import Server

from . import obsconfig
from .permissions import PERMISSION_TYPES


class obs:
    launch_command: list[str] | None = None
    cwd: Path | None = None


def find_process(names: set[str]) -> psutil.Process | None:
    for proc in psutil.process_iter():
        name = proc.name()
        if name in names:
            return proc
    return None


def shutdown_obs(process: psutil.Process):
    if sys.platform == "win32":
        from .hwnd_helpers import close_process_window

        close_process_window(process)
    elif sys.platform == "linux":
        process.send_signal(signal.SIGINT)
    elif sys.platform == "darwin":
        process.send_signal(signal.SIGINT)
    else:
        raise Exception(f"Unsupported platform: {sys.platform}")


def ensure_obs_stop() -> bool:
    process = find_process({"obs64.exe", "obs32.exe"})
    if not process:
        return False

    obs.launch_command = process.cmdline()
    obs.cwd = Path(process.cwd())

    root = tkinter.Tk()
    root.withdraw()

    def wait_for_process_to_end():
        if process.is_running():
            root.after(200, wait_for_process_to_end)
        else:
            root.destroy()

    root.after(200, wait_for_process_to_end)

    res = messagebox.Message(
        root,
        title="OMUAPPS OBSプラグイン",
        message="導入をするには一度OBSを再起動する必要があります。再起動しますか？",
        icon=messagebox.WARNING,
        type=messagebox.YESNO,
    ).show()
    if not res:
        return False
    elif res == messagebox.YES:
        shutdown_obs(process)
    elif res == messagebox.NO:
        return True

    while process.is_running():
        res = messagebox.Message(
            root,
            title="OMUAPPS OBSプラグイン",
            message="OBSを終了しています。終了しない場合は手動で終了してください。",
            icon=messagebox.WARNING,
            type=messagebox.RETRYCANCEL,
        ).show()
        if not res:
            return False
        elif res == messagebox.CANCEL:
            return True
        elif res == messagebox.RETRY:
            pass
        else:
            raise Exception(f"Unknown response: {res}")

    return False


def get_obs_path():
    if sys.platform == "win32":
        APP_DATA = os.getenv("APPDATA")
        if not APP_DATA:
            raise Exception("APPDATA not found")
        return Path(APP_DATA) / "obs-studio"
    else:
        return Path("~/.config/obs-studio").expanduser()


def get_rye_directory():
    version_string = "cpython@%d.%d.%d" % (
        sys.version_info.major,
        sys.version_info.minor,
        sys.version_info.micro,
    )
    rye_dir = Path.home() / ".rye" / "py" / version_string
    return rye_dir


def is_venv():
    return hasattr(sys, "real_prefix") or (
        hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix
    )


def get_python_directory():
    rye_dir = get_rye_directory()
    if is_venv() and rye_dir.exists():
        path = rye_dir
    else:
        path = Path(sys.executable).parent.parent
    return str(path).replace("\\\\", "\\").replace("\\", "/")


class ScriptToolJson(TypedDict):
    path: str
    settings: Any


ModulesJson = TypedDict("ModulesJson", {"scripts-tool": list[ScriptToolJson]})


class SceneJson(TypedDict):
    modules: ModulesJson


def is_installed():
    obs_path = get_obs_path()

    launcher_path = Path(__file__).parent / "script" / "omuapps_plugin.py"
    scenes_path = obs_path / "basic" / "scenes"
    for scene in scenes_path.glob("*.json"):
        data = SceneJson(**json.loads(scene.read_text(encoding="utf-8")))
        is_installed = any(
            Path(launcher_path) == Path(x["path"])
            for x in data.get("modules", {}).get("scripts-tool", [])
        )
        if not is_installed:
            return False

    python_path = get_python_directory()
    path = obs_path / "global.ini"
    config = obsconfig.load_configuration(path)
    python = config.get("Python", {})
    is_python_set = python.get("Path32bit") == python.get("Path64bit") == python_path
    if not is_python_set:
        return False

    return True


def setup_python_path():
    path = get_obs_path() / "global.ini"
    python_path = get_python_directory()

    config = obsconfig.load_configuration(path)
    config["Python"] = {
        **config.get("Python", {}),
        "Path64bit": python_path,
        "Path32bit": python_path,
    }
    obsconfig.save_configuration(path, config)


def install_script(launcher: Path, scene: Path):
    data = SceneJson(**json.loads(scene.read_text(encoding="utf-8")))
    scripts = data.get("modules", {}).get("scripts-tool", [])

    is_script_installed = any(Path(launcher) == Path(x["path"]) for x in scripts)
    if is_script_installed:
        return

    data["modules"]["scripts-tool"] = [
        *scripts,
        {
            "path": str(launcher),
            "settings": {},
        },
    ]
    scene.write_text(json.dumps(data), encoding="utf-8")


def get_launch_command():
    import os
    import sys

    return {
        "cwd": os.getcwd(),
        "args": [sys.executable, "-m", "omuserver", *sys.argv[1:]],
    }


def install_all_scene():
    script_path = Path(__file__).parent / "script"
    config_path = script_path / "config.json"
    config_path.write_text(json.dumps(get_launch_command()), encoding="utf-8")
    launcher_path = script_path / "omuapps_plugin.py"

    scenes_path = get_obs_path() / "basic" / "scenes"
    for scene in scenes_path.glob("*.json"):
        install_script(launcher_path, scene)


def relaunch_obs():
    if obs.launch_command:
        subprocess.Popen(obs.launch_command, cwd=obs.cwd)


def install():
    try:
        if is_installed():
            return

        ensure_obs_stop()
        setup_python_path()
        install_all_scene()

        relaunch_obs()
    except Exception:
        logger.opt(exception=True).error("Failed to install OBS plugin: {e}")
        raise


async def on_start_server(server: Server) -> None:
    thread = Thread(target=install)
    thread.start()
    server.permission_manager.register(*PERMISSION_TYPES)

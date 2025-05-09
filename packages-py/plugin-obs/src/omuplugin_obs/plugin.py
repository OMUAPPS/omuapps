from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tkinter
from pathlib import Path
from tkinter import messagebox
from typing import Any, TypedDict

import psutil
from loguru import logger
from omu.result import Err, Ok, Result
from omuserver.helper import LOG_DIRECTORY
from omuserver.server import Server

from . import obsconfig
from .script.config import LaunchCommand, get_config, get_config_path, save_config


class obs:
    launch_command: list[str] | None = None
    cwd: Path | None = None


def find_process(names: set[str]) -> psutil.Process | None:
    for proc in psutil.process_iter():
        try:
            name = proc.name()
            if name in names:
                return proc
        except psutil.NoSuchProcess:
            pass
    return None


def shutdown_obs(process: psutil.Process):
    if sys.platform == "win32":
        try:
            from .hwnd_helpers import close_process_window

            close_process_window(process)
        except Exception as e:
            logger.opt(exception=e).error("Failed to close OBS window: {e}")
        process.terminate()
    elif sys.platform == "linux":
        process.send_signal(signal.SIGINT)
    elif sys.platform == "darwin":
        process.send_signal(signal.SIGINT)
    else:
        raise Exception(f"Unsupported platform: {sys.platform}")


def ensure_obs_stopped() -> Result[None, str]:
    process = find_process({"obs64.exe", "obs32.exe"})
    if not process:
        return Ok(None)

    obs.launch_command = process.cmdline()
    obs.cwd = Path(process.cwd())

    root = tkinter.Tk()
    root.withdraw()
    root.attributes("-topmost", True)

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
    if not res or res == messagebox.YES:
        shutdown_obs(process)
    elif res == messagebox.NO:
        return Err("User cancelled OBS shutdown")

    while process.is_running():
        res = messagebox.Message(
            root,
            title="OMUAPPS OBSプラグイン",
            message="OBSを終了しています。終了しない場合は手動で終了してください。",
            icon=messagebox.WARNING,
            type=messagebox.RETRYCANCEL,
        ).show()
        if not res or res == messagebox.RETRY:
            pass
        elif res == messagebox.CANCEL:
            return Err("User cancelled OBS shutdown while waiting for process to end (cancel)")
        else:
            raise Exception(f"Unknown response: {res}")

    return Ok(None)


def get_obs_path():
    if sys.platform == "win32":
        APP_DATA = os.getenv("APPDATA")
        if not APP_DATA:
            raise Exception("APPDATA not found")
        return Path(APP_DATA) / "obs-studio"
    else:
        return Path("~/.config/obs-studio").expanduser()


def get_rye_directory():
    version_string = f"cpython@{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    rye_dir = Path.home() / ".rye" / "py" / version_string
    return rye_dir


def is_venv():
    return hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix)


def get_python_directory():
    rye_dir = get_rye_directory()
    if is_venv() and rye_dir.exists():
        path = rye_dir
    else:
        path = Path(sys.executable).parent
    return str(path).replace("\\\\", "\\").replace("\\", "/")


class ScriptToolJson(TypedDict):
    path: str
    settings: Any


ModulesJson = TypedDict("ModulesJson", {"scripts-tool": list[ScriptToolJson]})


class SceneJson(TypedDict):
    modules: ModulesJson


def check_installed() -> Result[bool, str]:
    config_path = get_config_path()
    if not config_path.exists():
        return Err(f"Config file not found: {config_path}")

    obs_path = get_obs_path()

    launcher_path = Path(__file__).parent / "script" / "omuapps_plugin.py"
    scenes_path = obs_path / "basic" / "scenes"
    for scene in scenes_path.glob("*.json"):
        data = SceneJson(**json.loads(scene.read_text(encoding="utf-8")))
        scripts = data.get("modules", {}).get("scripts-tool", [])
        found = False
        for script in scripts:
            path_text = script.get("path")
            if not path_text:
                continue
            path = Path(path_text)
            if not path.exists():
                continue
            if path.name == launcher_path.name and not path.samefile(launcher_path):
                return Err(f"Script path is not the same as launcher path: {path} != {launcher_path}")
            if path.samefile(launcher_path):
                found = True
        if not found:
            return Err(f"Script not found in scene: {scene}")

    python_path = get_python_directory()
    path = obs_path / "user.ini"
    config = obsconfig.load_configuration(path)
    python = config.get("Python", {})
    is_python_set = python.get("Path32bit") == python.get("Path64bit") == python_path
    if not is_python_set:
        return Err(f"Python path is not set correctly in user.ini: {python_path} != {python}")

    return Ok(True)


def setup_python_path():
    path = get_obs_path() / "user.ini"
    python_path = get_python_directory()

    config = obsconfig.load_configuration(path)
    config["Python"] = {
        **config.get("Python", {}),
        "Path64bit": python_path,
        "Path32bit": python_path,
    }
    obsconfig.save_configuration(path, config)


def install_script(script_path: Path, scene: Path):
    data = SceneJson(**json.loads(scene.read_text(encoding="utf-8")))
    scripts = data.get("modules", {}).get("scripts-tool", [])
    filtered_scripts: list[ScriptToolJson] = []
    for script in scripts:
        path_text = script.get("path")
        if not path_text:
            continue
        path = Path(path_text)
        if not path.exists():
            continue
        if path.name == script_path.name:
            continue
        if path.samefile(script_path):
            continue
        filtered_scripts.append(script)

    filtered_scripts.append({"path": str(script_path), "settings": {}})
    data["modules"]["scripts-tool"] = filtered_scripts
    scene.write_text(json.dumps(data), encoding="utf-8")


def install_all_scene():
    script_path = Path(__file__).parent / "script"
    launcher_path = script_path / "omuapps_plugin.py"

    scenes_path = get_obs_path() / "basic" / "scenes"
    for scene in scenes_path.glob("*.json"):
        install_script(launcher_path, scene)


def relaunch_obs():
    if obs.launch_command:
        logger.info(f"Relaunching OBS: {obs.launch_command}")
        subprocess.Popen(obs.launch_command, cwd=obs.cwd)


def update_config(server: Server):
    config = get_config()
    dashboard = server.directories.dashboard
    if dashboard:
        config["launch"] = LaunchCommand(args=[dashboard.resolve().as_posix(), "--background"])
    config["python_path"] = get_python_directory()
    config["log_path"] = LOG_DIRECTORY.resolve().as_posix()
    logger.info(f"Updated config: {config}")
    save_config(config)


def install(server: Server):
    update_config(server)

    try:
        installed = check_installed()
        if installed.is_ok is True:
            logger.info("OBS plugin is already installed")
            return
        logger.warning(f"OBS plugin is not installed: {installed.err}")
        match ensure_obs_stopped():
            case Ok(_):
                logger.info("OBS stopped successfully")
            case Err(err):
                logger.error(f"Failed to stop OBS: {err}")
                return

        setup_python_path()
        install_all_scene()

        relaunch_obs()
    except Exception as e:
        logger.opt(exception=e).error("Failed to install OBS plugin")
        raise e
    else:
        logger.info("Successfully installed OBS plugin")

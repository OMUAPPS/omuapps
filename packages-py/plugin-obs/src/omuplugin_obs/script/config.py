import json
from pathlib import Path
from typing import NotRequired, TypedDict

from loguru import logger
from omuplugin_obs.const import PLUGIN_ID
from omuserver.helper import start_compressing_logs


class LaunchCommand(TypedDict):
    args: list[str]
    cwd: NotRequired[str]


class Config(TypedDict):
    log_path: NotRequired[str]
    python_path: NotRequired[str]
    launch: NotRequired[LaunchCommand]


def get_config_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True, parents=True)
    config = appdata / "obs_config.json"
    return config


def get_config() -> Config:
    path = get_config_path()
    if not path.exists():
        return {}
    try:
        return Config(**json.loads(path.read_text(encoding="utf-8")))
    except FileNotFoundError:
        print(f"Config file not found at {path}")
    except json.JSONDecodeError:
        print(f"Config file at {path} is not valid JSON")
    return {}


def save_config(config: Config) -> None:
    path = get_config_path()
    path.write_text(json.dumps(config), encoding="utf-8")


def get_log_path() -> Path:
    config = get_config()
    log_path = config.get("log_path")
    if log_path and Path(log_path).exists():
        return Path(log_path)
    log_path = Path.home() / ".omuapps" / "logs"
    log_path.mkdir(exist_ok=True, parents=True)
    start_compressing_logs(log_path)
    return log_path


def setup_logger() -> None:
    import os
    import sys

    import obspython

    class stdout_logger:
        def write(self, message):
            obspython.script_log_no_endl(obspython.LOG_INFO, message)

        def flush(self): ...

    class stderr_logger:
        def write(self, message):
            obspython.script_log_no_endl(obspython.LOG_INFO, message)

        def flush(self): ...

    os.environ["PYTHONUNBUFFERED"] = "1"
    sys.stdout = stdout_logger()
    sys.stderr = stderr_logger()
    from omuserver.helper import setup_logger

    logger.remove()
    setup_logger(PLUGIN_ID, base_dir=get_log_path())


def get_token_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True)
    config = appdata / "token.json"
    return config

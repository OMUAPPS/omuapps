from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import NotRequired, TypedDict

from loguru import logger
from omu.address import Address, AddressJSON
from omu.result import Err, Ok, Result
from omuserver.helper import start_compressing_logs
from omuserver.server import Server

from .const import PLUGIN_ID


class LaunchCommand(TypedDict):
    args: list[str]
    cwd: NotRequired[str]


class ConfigJSON(TypedDict):
    log_path: NotRequired[str]
    python_path: NotRequired[str]
    server: NotRequired[AddressJSON]
    launch: NotRequired[LaunchCommand | None]


@dataclass(frozen=True, slots=True)
class Config:
    path: Path
    json: ConfigJSON

    @staticmethod
    def get_config_path() -> Path:
        appdata = Path.home() / ".omuapps"
        appdata.mkdir(exist_ok=True, parents=True)
        config = appdata / "obs_config.json"
        return config

    @staticmethod
    def get_token_path() -> Path:
        appdata = Path.home() / ".omuapps"
        appdata.mkdir(exist_ok=True)
        config = appdata / "token.json"
        return config

    @staticmethod
    def load() -> Result[Config, str]:
        path = Config.get_config_path()
        if not path.exists():
            return Ok(
                Config(
                    path=path,
                    json=ConfigJSON(),
                )
            )
        try:
            return Ok(
                Config(
                    path=path,
                    json=ConfigJSON(**json.loads(path.read_text(encoding="utf-8"))),
                )
            )
        except FileNotFoundError:
            return Err(f"Config file not found at {path}")
        except json.JSONDecodeError:
            return Err(f"Config file at {path} is not valid JSON")
        except Exception as e:
            return Err(f"Config file {path} read failed: {e}")

    def store(self) -> None:
        self.path.write_text(json.dumps(self.json), encoding="utf-8")

    def get_log_path(self) -> Path:
        log_path = self.json.get("log_path")
        if log_path and Path(log_path).exists():
            return Path(log_path)
        log_path = Path.home() / ".omuapps" / "logs"
        log_path.mkdir(exist_ok=True, parents=True)
        start_compressing_logs(log_path)
        return log_path

    def get_server_address(self) -> Address | None:
        address = self.json.get("server")
        if address is None:
            return None
        return Address(**address)

    def get_python_path(self) -> Path | None:
        python_path = self.json.get("python_path")
        if not python_path or not Path(python_path).exists():
            return
        return Path(python_path)

    def set_launch(self, server: Server):
        if server.directories.dashboard:
            self.json["launch"] = LaunchCommand(
                cwd=Path.cwd().resolve().as_posix(),
                args=[server.directories.dashboard.resolve().as_posix(), "--background"],
            )

    def unset_launch(self):
        if "launch" in self.json:
            del self.json["launch"]

    def launch_server(self):
        launch_command = self.json.get("launch")
        if launch_command is None:
            logger.info("No launch command found. Skipping")
            return
        startup_info = subprocess.STARTUPINFO()
        startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW

        args = launch_command["args"]
        if not args:
            logger.error("No arguments provided in launch command")
            return
        executable = args.pop(0)
        if not Path(executable).exists():
            logger.error(f"Executable {executable} does not exist")
            return
        if not Path(executable).is_file():
            logger.error(f"Executable {executable} is not a file")
            return
        if not Path(executable).is_absolute():
            logger.warning(f"Executable {executable} is not an absolute path")

        process = subprocess.Popen(
            [executable, *args],
            cwd=launch_command.get("cwd"),
            startupinfo=startup_info,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        logger.info(f"Launched dashboard with PID {process.pid} using command {launch_command}")

    def setup_logger(self) -> None:
        import sys

        import obspython  # type: ignore

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
        setup_logger(PLUGIN_ID, base_dir=self.get_log_path())

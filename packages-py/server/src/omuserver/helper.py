import os
import sys
from collections.abc import Generator
from pathlib import Path
from typing import TypedDict

import psutil


def safe_path(root_path: Path, input_path: Path) -> Path:
    """
    How to prevent directory traversal attack from Python code
    https://stackoverflow.com/a/45190125
    """
    resolved_path = root_path.joinpath(input_path).resolve()
    if not resolved_path.is_relative_to(root_path.resolve()):
        raise ValueError(f"Path {input_path} is not relative to {root_path}")
    return resolved_path.relative_to(root_path.resolve())


def safe_path_join(root: Path, *paths: Path | str) -> Path:
    return root / safe_path(root, root.joinpath(*paths))


class LaunchCommand(TypedDict):
    cwd: str
    args: list[str]


def get_launch_command() -> LaunchCommand:
    args = [sys.executable, "-m", "omuserver", *sys.argv[1:]]
    return {
        "cwd": os.getcwd(),
        "args": args,
    }


def find_processes_by_port(port: int) -> Generator[psutil.Process, None, None]:
    for connection in psutil.net_connections():
        try:
            if connection.laddr and connection.laddr.port == port:
                yield psutil.Process(connection.pid)
        except psutil.NoSuchProcess:
            pass


def find_processes_by_executable(
    executable: Path,
) -> Generator[psutil.Process, None, None]:
    for process in psutil.process_iter():
        try:
            if Path(process.exe()).resolve() == executable.resolve():
                yield process
        except psutil.NoSuchProcess:
            pass

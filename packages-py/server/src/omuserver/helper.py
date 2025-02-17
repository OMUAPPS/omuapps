import datetime
import io
import sys
import time
from collections.abc import Generator
from pathlib import Path

import psutil
from loguru import logger
from omu.app import App
from omu.identifier import Identifier

LOG_DIRECTORY = Path("logs")


def _ensure_log_dir(path: Path) -> Path:
    path = path.resolve()
    if path.exists() and not path.is_dir():
        logger.error(f"Log directory {path} is not a directory")
        path.unlink()
    if not path.exists():
        path.mkdir(exist_ok=True, parents=True)
    return path


def _get_log_path(name: str, base_dir=LOG_DIRECTORY) -> Path:
    time_str = datetime.datetime.now().strftime("%H-%M-%S")
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    base_dir = base_dir.resolve()
    path = base_dir / date_str / f"{time_str}-{name}.log"
    index = 1
    while path.exists():
        time_str = datetime.datetime.now().strftime("%H-%M-%S")
        path = base_dir / date_str / f"{time_str}-{name}-{index}.log"
        index += 1
    return path


def _cleanup_logs(base_dir: Path) -> None:
    SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7
    for file in base_dir.glob("**/*"):
        try:
            if not file.is_file():
                continue
            stats = file.stat()
            elapsed = time.time() - stats.st_mtime
            if elapsed > SEVEN_DAYS_IN_SECONDS:
                file.unlink()
        except (FileNotFoundError, IsADirectoryError):
            pass
        except PermissionError:
            logger.warning(f"Permission denied to delete log file {file}")
        except Exception as e:
            logger.opt(exception=e).error(f"Error deleting log file {file}")
    for file in base_dir.glob("**/*"):
        try:
            if not file.is_dir():
                continue
            if not any(file.iterdir()):
                file.rmdir()
        except (FileNotFoundError, IsADirectoryError):
            pass
        except PermissionError:
            logger.warning(f"Permission denied to delete log file {file}")
        except Exception as e:
            logger.opt(exception=e).error(f"Error deleting log file {file}")


def setup_logger(name: str | App | Identifier, base_dir=LOG_DIRECTORY) -> None:
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    if isinstance(sys.stderr, io.TextIOWrapper):
        sys.stderr.reconfigure(encoding="utf-8")
    # <logdir>/<date>/<logger-name>-<time>.log
    if isinstance(name, App):
        name = name.id.get_sanitized_key()
    elif isinstance(name, Identifier):
        name = name.get_sanitized_key()
    _ensure_log_dir(base_dir)
    log_file_path = _get_log_path(name, base_dir=base_dir)
    logger.add(
        log_file_path,
        colorize=False,
        format=("{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | " "{name}:{function}:{line} - {message}"),
        retention="7 days",
        compression="zip",
    )
    logger.info(f"Logging to {log_file_path}")
    _cleanup_logs(base_dir)


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


def find_processes_by_port(port: int) -> Generator[psutil.Process, None, None]:
    for connection in psutil.net_connections():
        try:
            if connection.laddr and connection.laddr.port == port:
                yield psutil.Process(connection.pid)
        except psutil.NoSuchProcess:
            pass
        except psutil.AccessDenied:
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
        except psutil.AccessDenied:
            pass

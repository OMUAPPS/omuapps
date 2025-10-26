import os
import platform
import signal
import sys
import tracemalloc
from pathlib import Path

import click
import psutil
from loguru import logger
from omu.address import Address

from omuserver.config import Config
from omuserver.helper import (
    find_processes_by_executable,
    find_processes_by_port,
    setup_logger,
    start_compressing_logs,
)
from omuserver.migration import migrate
from omuserver.server import Server
from omuserver.version import VERSION


def stop_server_processes(port: int):
    executable = Path(sys.executable)
    self_pid = os.getpid()
    parents_pids = {p.pid for p in psutil.Process(self_pid).parents()}
    processed: set[int] = set()

    def _handle(process, warn_non_python: bool):
        pid = process.pid
        if pid in processed:
            return
        processed.add(pid)
        try:
            if not process.is_running():
                return
            if pid == self_pid:
                logger.debug(f"Skipping self process {pid}")
                return
            if pid in parents_pids:
                logger.debug(f"Skipping parent process {pid}")
                return
            if warn_non_python:
                try:
                    exe = Path(process.exe())
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    exe = None
                if exe != executable:
                    logger.warning(f"Process {pid} ({process.name()}) is not a Python process")
            logger.info(f"Killing process {pid} ({process.name()})")
            process.send_signal(signal.SIGTERM)
        except psutil.NoSuchProcess:
            logger.warning(f"Process {pid} not found")
        except psutil.AccessDenied:
            logger.warning(f"Access denied to process {pid}")

    for process in find_processes_by_port(port):
        _handle(process, warn_non_python=True)
    else:
        logger.info(f"No processes found using port {port}")

    for process in find_processes_by_executable(executable):
        _handle(process, warn_non_python=False)
    else:
        logger.info(f"No other processes found with executable {executable}")


@click.command()
@click.option("--debug", is_flag=True)
@click.option("--stop", is_flag=True)
@click.option("--token", type=str, default=None)
@click.option("--token-file", type=click.Path(), default=None)
@click.option("--dashboard-path", type=click.Path(), default=None)
@click.option("--port", type=int, default=None)
@click.option("--hash", type=str, default=None)
@click.option("--extra-trusted-origin", type=str, multiple=True)
def main(
    debug: bool,
    stop: bool,
    token: str | None,
    token_file: str | None,
    dashboard_path: str | None,
    port: int | None,
    hash: str | None,
    extra_trusted_origin: list[str],
):
    logger.info(f"// omuserver v{VERSION} (pid={os.getpid()}) at ({Path.cwd()}) on ({platform.platform()})")
    config = Config()
    config.address = Address(
        host=config.address.host,
        port=port or config.address.port,
        hash=hash,
        secure=config.address.secure,
    )

    if stop:
        stop_server_processes(config.address.port)
        os._exit(0)

    if dashboard_path:
        config.directories.dashboard = Path(dashboard_path).resolve()

    if token:
        config.dashboard_token = token
    elif token_file:
        config.dashboard_token = Path(token_file).read_text(encoding="utf-8").strip()
    else:
        config.dashboard_token = None

    config.extra_trusted_origins = list(extra_trusted_origin)
    if config.extra_trusted_origins:
        logger.info(f"Extra trusted hosts: {config.extra_trusted_origins}")

    if debug:
        logger.warning("Debug mode enabled")
        tracemalloc.start()

    server = Server(config=config)

    migrate(server)
    logger.info(f"Starting at {config.address.hash} {config.address.to_url()}")
    server.run()


if __name__ == "__main__":
    log_dir = setup_logger("omuserver")
    start_compressing_logs(log_dir)
    try:
        main()
    except Exception as e:
        logger.opt(exception=e).error("Error running server")
        sys.exit(1)

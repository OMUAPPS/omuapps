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


def stop_server_processes(
    port: int,
):
    logger.info(f"Stopping server processes using port {port}")
    executable = Path(sys.executable)
    found_processes = list(find_processes_by_port(port))
    if not found_processes:
        logger.info(f"No processes found using port {port}")
    else:
        for process in found_processes:
            try:
                if process.exe() != executable:
                    logger.warning(f"Process {process.pid} ({process.name()}) is not a Python process")
                logger.info(f"Killing process {process.pid} ({process.name()})")
                process.send_signal(signal.SIGTERM)
            except psutil.NoSuchProcess:
                logger.warning(f"Process {process.pid} not found")
            except psutil.AccessDenied:
                logger.warning(f"Access denied to process {process.pid}")
    executable_processes = list(find_processes_by_executable(executable))
    self_pid = os.getpid()
    for process in executable_processes:
        try:
            if process.pid == self_pid:
                continue
            logger.info(f"Killing process {process.pid} ({process.name()})")

            process.send_signal(signal.SIGTERM)
        except psutil.NoSuchProcess:
            logger.warning(f"Process {process.pid} not found")
        except psutil.AccessDenied:
            logger.warning(f"Access denied to process {process.pid}")

    logger.info("Finished stopping server processes")


@click.command()
@click.option("--debug", is_flag=True)
@click.option("--stop", is_flag=True)
@click.option("--token", type=str, default=None)
@click.option("--token-file", type=click.Path(), default=None)
@click.option("--dashboard-path", type=click.Path(), default=None)
@click.option("--port", type=int, default=None)
@click.option("--hash", type=str, default=None)
@click.option("--extra-trusted-origin", type=str, multiple=True)
@click.option("--index-url", type=str, default=None)
def main(
    debug: bool,
    stop: bool,
    token: str | None,
    token_file: str | None,
    dashboard_path: str | None,
    port: int | None,
    hash: str | None,
    extra_trusted_origin: list[str],
    index_url: str | None,
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
        sys.exit(0)

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
    config.index_url = index_url

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

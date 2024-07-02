import asyncio
import io
import sys
import tracemalloc
from pathlib import Path

import click
from loguru import logger
from omu.address import Address

from omuserver.config import Config
from omuserver.lock import Lock
from omuserver.server.omuserver import OmuServer


def setup_logging():
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")
    if isinstance(sys.stderr, io.TextIOWrapper):
        sys.stderr.reconfigure(encoding="utf-8")
    logger.add(
        "logs/{time:YYYY-MM-DD}.log",
        rotation="1 day",
        colorize=False,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
            "{name}:{function}:{line} - {message}"
        ),
    )


@click.command()
@click.option("--debug", is_flag=True)
@click.option("--lock-file", type=click.Path(), default=None)
@click.option("--port", type=int, default=26423)
def main(
    debug: bool,
    lock_file: str | None,
    port: int,
):
    loop = asyncio.get_event_loop()

    config = Config()
    config.address = Address(
        host=None,
        port=int(port),
        secure=False,
    )
    lock_path = Path(lock_file or "server.lock")
    lock = Lock.load(lock_path)
    lock.acquire(lock_path)
    config.dashboard_token = lock.token

    if debug:
        logger.warning("Debug mode enabled")
        logger.warning("Strict origin disabled")
        config.strict_origin = False
        tracemalloc.start()

    server = OmuServer(config=config, loop=loop)

    logger.info("Starting server...")
    server.run()


if __name__ == "__main__":
    setup_logging()
    main()

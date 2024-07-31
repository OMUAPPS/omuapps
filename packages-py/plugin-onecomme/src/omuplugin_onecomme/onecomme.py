import asyncio
import os
from pathlib import Path

import psutil
from loguru import logger
from omuserver.server import Server


def find_onecomme_binary() -> Path | None:
    to_check: list[Path] = []
    if os.name == "nt":
        to_check.append(Path(os.environ["ProgramFiles"]) / "OneComme" / "OneComme.exe")
    else:
        # TODO: Implement for other platforms
        raise NotImplementedError("OneComme is only supported on Windows")
    for path in to_check:
        if path.exists():
            return path
    return None


def find_onecomme_config() -> Path | None:
    to_check: list[Path] = []
    if os.name == "nt":
        to_check.append(Path(os.environ["APPDATA"]) / "OneComme" / "config.json")
    else:
        # TODO: Implement for other platforms
        raise NotImplementedError("OneComme is only supported on Windows")
    for path in to_check:
        if path.exists():
            return path
    return None


def terminate_onecomme():
    for proc in psutil.process_iter():
        name = proc.name()
        if name in {"OneComme.exe", "OneComme"}:
            proc.terminate()
            logger.info("OneComme terminated")


async def start_onecomme(server: Server):
    terminate_onecomme()
    # https://onecomme.com/news/#:~:text=--disable-api-server%3A%20APIサーバーを起動しない
    bin = find_onecomme_binary()
    if bin is None:
        logger.error("OneComme binary not found")
        return
    await asyncio.create_subprocess_exec(
        bin,
        "",  # empty args for issue https://forum.onecomme.com/t/topic/1641
        "--disable-api-server",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    logger.info("OneComme started")

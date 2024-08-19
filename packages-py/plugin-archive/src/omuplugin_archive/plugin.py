import asyncio
import os
from pathlib import Path

import yt_dlp.version
from omu import Omu
from omu_chat import Chat, Room, events

from .archive import Archive, ArchiveConfig
from .const import APP
from .types import (
    ARCHIVE_TABLE_TYPE,
    CONFIG_REGISTRY_TYPE,
    OPEN_OUTPUT_DIR_ENDPOINT_TYPE,
)

omu = Omu(APP)
chat = Chat(omu)

archive_table = omu.tables.get(ARCHIVE_TABLE_TYPE)
config_registry = omu.registry.get(CONFIG_REGISTRY_TYPE)


@config_registry.listen
async def on_config_update(config: ArchiveConfig):
    path = Path(config["output_dir"])
    path.mkdir(parents=True, exist_ok=True)
    if config["active"]:
        rooms = await chat.rooms.fetch_items(before=10)
        for room in rooms.values():
            await process_room(room)


@omu.endpoints.bind(endpoint_type=OPEN_OUTPUT_DIR_ENDPOINT_TYPE)
async def handle_open_output_dir(req: None):
    os.startfile(config_registry.value["output_dir"])


archive_threads: dict[str, Archive] = {}


def archive_thread(archive: Archive):
    options = {
        **config_registry.value["yt_dlp_options"],
        "paths": {
            "home": config_registry.value["output_dir"],
        },
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(archive.url, download=False)
        if info:
            archive.description = info.get("description", archive.description)
            archive.duration = info.get("duration", archive.duration)
            archive.published_at = info.get("published_at", archive.published_at)
            archive.thumbnail = info.get("thumbnail", archive.thumbnail)
            archive.title = info.get("title", archive.title)
        ydl.download([archive.url])


async def start_archive(archive: Archive):
    if archive.id in archive_threads:
        return
    archive_threads[archive.id] = archive

    def thread():
        try:
            archive_thread(archive)
            archive.status = "completed"
        except Exception:
            archive.status = "failed"
        finally:
            del archive_threads[archive.id]
            asyncio.run_coroutine_threadsafe(archive_table.update(archive), omu.loop)

    asyncio.get_running_loop().run_in_executor(None, thread)


@chat.on(events.room.add)
async def on_room_add(room: Room):
    if not config_registry.value["active"]:
        return
    return await process_room(room)


async def process_room(room: Room):
    metadata = room.metadata or {}
    url = metadata.get("url")
    if url is None:
        return
    archive = Archive(
        {
            "id": room.id.key(),
            "url": url,
            "status": "pending",
            "description": metadata.get("description"),
            "duration": metadata.get("duration"),
            "published_at": metadata.get("published_at"),
            "thumbnail": metadata.get("thumbnail"),
            "title": metadata.get("title"),
        }
    )
    await archive_table.add(archive)
    await start_archive(archive)


@chat.on(events.room.update)
async def on_room_update(room: Room):
    archive = await archive_table.get(room.id.key())
    if archive is None:
        return
    metadata = room.metadata or {}
    archive.description = metadata.get("description", archive.description)
    archive.published_at = metadata.get("created_at", archive.published_at)
    archive.thumbnail = metadata.get("thumbnail", archive.thumbnail)
    archive.title = metadata.get("title", archive.title)
    await archive_table.update(archive)


async def refresh_ytdlp_info():
    @config_registry.update
    async def update_config(config: ArchiveConfig) -> ArchiveConfig:
        return {
            **config,
            "yt_dlp_info": {
                "version": yt_dlp.version.__version__,
                "git_head": yt_dlp.version.RELEASE_GIT_HEAD,
                "variant": yt_dlp.version.VARIANT,
                "update_hint": yt_dlp.version.UPDATE_HINT,
                "channel": yt_dlp.version.CHANNEL,
                "origin": yt_dlp.version.ORIGIN,
            },
        }

    await update_config


async def process_pending_archives():
    archive_records = await archive_table.fetch_items(after=10)
    for archive in archive_records.values():
        if archive.status != "pending":
            continue
        await start_archive(archive)


@omu.on_ready
async def on_ready():
    await refresh_ytdlp_info()
    await process_pending_archives()

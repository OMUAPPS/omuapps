from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from omu.extension.asset.asset_extension import (
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
    File,
)
from omu.identifier import Identifier

from omuserver.helper import safe_path_join
from omuserver.session import Session

from .permissions import (
    ASSET_DOWNLOAD_PERMISSION,
    ASSET_UPLOAD_PERMISSION,
)

if TYPE_CHECKING:
    from omuserver.server import Server


class FileStorage:
    def __init__(self, path: Path) -> None:
        self._path = path

    async def store(self, file: File) -> Identifier:
        path = file.identifier.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(file.buffer)
        return file.identifier

    async def retrieve(self, identifier: Identifier) -> File:
        path = identifier.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        return File(identifier, file_path.read_bytes())


class AssetExtension:
    def __init__(self, server: Server) -> None:
        self._server = server
        self.storage = FileStorage(server.directories.assets)
        server.permission_manager.register(ASSET_UPLOAD_PERMISSION, ASSET_DOWNLOAD_PERMISSION)
        server.endpoints.bind(ASSET_UPLOAD_ENDPOINT, self.handle_upload)
        server.endpoints.bind(ASSET_UPLOAD_MANY_ENDPOINT, self.handle_upload_many)
        server.endpoints.bind(ASSET_DOWNLOAD_ENDPOINT, self.handle_download)
        server.endpoints.bind(ASSET_DOWNLOAD_MANY_ENDPOINT, self.handle_download_many)

    async def handle_upload(self, session: Session, file: File) -> Identifier:
        identifier = await self.storage.store(file)
        return identifier

    async def handle_upload_many(self, session: Session, files: list[File]) -> list[Identifier]:
        asset_ids: list[Identifier] = []
        for file in files:
            id = await self.storage.store(file)
            asset_ids.append(id)
        return asset_ids

    async def handle_download(self, session: Session, id: Identifier) -> File:
        return await self.storage.retrieve(id)

    async def handle_download_many(self, session: Session, identifiers: list[Identifier]) -> list[File]:
        added_files: list[File] = []
        for id in identifiers:
            file = await self.storage.retrieve(id)
            added_files.append(file)
        return added_files

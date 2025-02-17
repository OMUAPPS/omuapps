from __future__ import annotations

import abc
from pathlib import Path

from omu.extension.asset.asset_extension import (
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
    File,
)
from omu.identifier import Identifier

from omuserver.helper import safe_path_join
from omuserver.server import Server
from omuserver.session import Session

from .permissions import (
    ASSET_DOWNLOAD_PERMISSION,
    ASSET_UPLOAD_PERMISSION,
)


class AssetStorage(abc.ABC):
    @abc.abstractmethod
    async def store(self, file: File) -> Identifier: ...

    @abc.abstractmethod
    async def retrieve(self, identifier: Identifier) -> File: ...


class FileStorage(AssetStorage):
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
        server.permission_manager.register(
            ASSET_UPLOAD_PERMISSION,
            ASSET_DOWNLOAD_PERMISSION,
        )
        server.endpoints.bind_endpoint(
            ASSET_UPLOAD_ENDPOINT,
            self.handle_upload,
        )
        server.endpoints.bind_endpoint(
            ASSET_UPLOAD_MANY_ENDPOINT,
            self.handle_upload_many,
        )
        server.endpoints.bind_endpoint(
            ASSET_DOWNLOAD_ENDPOINT,
            self.handle_download,
        )
        server.endpoints.bind_endpoint(
            ASSET_DOWNLOAD_MANY_ENDPOINT,
            self.handle_download_many,
        )

    async def handle_upload(self, session: Session, file: File) -> Identifier:
        identifier = await self.storage.store(file)
        return identifier

    async def handle_upload_many(
        self, session: Session, files: list[File]
    ) -> list[Identifier]:
        identifiers: list[Identifier] = []
        for file in files:
            identifier = await self.storage.store(file)
            identifiers.append(identifier)
        return identifiers

    async def handle_download(self, session: Session, identifier: Identifier) -> File:
        return await self.storage.retrieve(identifier)

    async def handle_download_many(
        self, session: Session, identifiers: list[Identifier]
    ) -> list[File]:
        files: list[File] = []
        for identifier in identifiers:
            file = await self.storage.retrieve(identifier)
            files.append(file)
        return files

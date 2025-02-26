from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING

from omu.errors import PermissionDenied
from omu.extension.asset.asset_extension import (
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
    Asset,
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


class AssetExtension:
    def __init__(self, server: Server) -> None:
        server.security.register(ASSET_UPLOAD_PERMISSION, ASSET_DOWNLOAD_PERMISSION)
        server.endpoints.bind(ASSET_UPLOAD_ENDPOINT, self.handle_upload)
        server.endpoints.bind(ASSET_UPLOAD_MANY_ENDPOINT, self.handle_upload_many)
        server.endpoints.bind(ASSET_DOWNLOAD_ENDPOINT, self.handle_download)
        server.endpoints.bind(ASSET_DOWNLOAD_MANY_ENDPOINT, self.handle_download_many)
        self._server = server
        self._path = server.directories.assets
        self.index_db = sqlite3.connect(server.directories.assets / "index.sqlite")
        self._index_cache: dict[Identifier, Path] = {}
        self.init_db()

    def init_db(self):
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                path TEXT
            )
            """
        )
        self.index_db.commit()

    async def store(self, file: Asset) -> Identifier:
        path = file.id.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(file.buffer)
        self.insert_asset_record(file.id, path)
        return file.id

    async def retrieve(self, identifier: Identifier) -> Asset | None:
        path = identifier.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        if not file_path.exists():
            return None
        self.insert_asset_record(identifier, path)
        return Asset(identifier, file_path.read_bytes())

    def insert_asset_record(self, identifier: Identifier, path: Path) -> None:
        if identifier in self._index_cache:
            return
        self._index_cache[identifier] = path
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO assets (id, path)
            VALUES (?, ?)
            """,
            (identifier, path),
        )
        self.index_db.commit()

    async def handle_upload(self, session: Session, file: Asset) -> Identifier:
        if not file.id.is_subpath_of(session.app.id):
            raise PermissionDenied(f"App {session.app.id=} not allowed to {file.id}")
        identifier = await self.store(file)
        return identifier

    async def handle_upload_many(self, session: Session, files: list[Asset]) -> list[Identifier]:
        asset_ids: list[Identifier] = []
        for file in files:
            if not file.id.is_subpath_of(session.app.id):
                raise PermissionDenied(f"App {session.app.id=} not allowed to {file.id}")
            id = await self.store(file)
            asset_ids.append(id)
        return asset_ids

    async def handle_download(self, session: Session, id: Identifier) -> Asset:
        if not id.is_subpath_of(session.app.id):
            raise PermissionDenied(f"App {session.app.id=} not allowed to {id}")
        asset = await self.retrieve(id)
        if asset is None:
            raise Exception(f"Asset {id} not found")
        return asset

    async def handle_download_many(self, session: Session, identifiers: list[Identifier]) -> list[Asset]:
        added_files: list[Asset] = []
        for id in identifiers:
            if not id.is_subpath_of(session.app.id):
                raise PermissionDenied(f"App {session.app.id=} not allowed to {id}")
            asset = await self.retrieve(id)
            if asset is None:
                raise Exception(f"Asset {id} not found")
            added_files.append(asset)
        return added_files

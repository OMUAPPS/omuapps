from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING

from omu.api.asset.extension import (
    ASSET_DELETE_ENDPOINT,
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
    Asset,
)
from omu.errors import PermissionDenied
from omu.identifier import Identifier

from omuserver.helper import safe_path_join
from omuserver.session import Session

from .permissions import (
    ASSET_DELETE_PERMISSION,
    ASSET_DOWNLOAD_PERMISSION,
    ASSET_UPLOAD_PERMISSION,
)

if TYPE_CHECKING:
    from omuserver.server import Server


class AssetIndex:
    def __init__(self, index_db: Path) -> None:
        self.index_db = sqlite3.connect(index_db)
        self.init_db()
        self._index_cache: dict[Identifier, Path] = {}

    def init_db(self):
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            download_count INTEGER DEFAULT 0
            )
            """
        )
        self.index_db.commit()

    def insert(self, identifier: Identifier, path: Path) -> None:
        if identifier in self._index_cache:
            return
        self._index_cache[identifier] = path
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO assets (id, path)
            VALUES (?, ?)
            """,
            (identifier.key(), path.as_posix()),
        )
        self.index_db.commit()

    def delete(self, identifier: Identifier) -> None:
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            DELETE FROM assets
            WHERE id = ?
            """,
            (identifier.key(),),
        )
        self.index_db.commit()
        if identifier in self._index_cache:
            del self._index_cache[identifier]

    def lookup_asset_path(self, identifier: Identifier) -> Path | None:
        if identifier in self._index_cache:
            return self._index_cache[identifier]
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            SELECT path
            FROM assets
            WHERE id = ?
            """,
            (identifier.key(),),
        )
        row = cursor.fetchone()
        if row is None:
            return None
        path = Path(row[0])
        self._index_cache[identifier] = path
        return path

    def record_download(self, identifier: Identifier) -> None:
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            UPDATE assets
            SET download_count = download_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (identifier.key(),),
        )
        self.index_db.commit()

    def record_upload(self, identifier: Identifier) -> None:
        cursor = self.index_db.cursor()
        cursor.execute(
            """
            UPDATE assets
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (identifier.key(),),
        )
        self.index_db.commit()


class AssetExtension:
    def __init__(self, server: Server) -> None:
        server.security.register(ASSET_UPLOAD_PERMISSION, ASSET_DOWNLOAD_PERMISSION, ASSET_DELETE_PERMISSION)
        server.endpoints.bind(ASSET_UPLOAD_ENDPOINT, self.handle_upload)
        server.endpoints.bind(ASSET_UPLOAD_MANY_ENDPOINT, self.handle_upload_many)
        server.endpoints.bind(ASSET_DOWNLOAD_ENDPOINT, self.handle_download)
        server.endpoints.bind(ASSET_DOWNLOAD_MANY_ENDPOINT, self.handle_download_many)
        server.endpoints.bind(ASSET_DELETE_ENDPOINT, self.handle_delete)
        self._server = server
        self._path = server.directories.assets
        self.index = AssetIndex(self._server.directories.assets / "index.sqlite")

    async def store(self, file: Asset) -> Identifier:
        path = file.id.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(file.buffer)
        self.index.insert(file.id, path)
        self.index.record_upload(file.id)
        return file.id

    async def retrieve(self, identifier: Identifier) -> Asset | None:
        path = identifier.get_sanitized_path()
        file_path = safe_path_join(self._path, path)
        if not file_path.exists():
            return None
        self.index.insert(identifier, path)
        self.index.record_download(identifier)
        return Asset(identifier, file_path.read_bytes())

    async def handle_upload(self, session: Session, file: Asset) -> Identifier:
        if not session.is_app_id(file.id):
            raise PermissionDenied(f"App {session.app.id=} not allowed to {file.id}")
        identifier = await self.store(file)
        return identifier

    async def handle_upload_many(self, session: Session, files: list[Asset]) -> list[Identifier]:
        asset_ids: list[Identifier] = []
        for file in files:
            if not session.is_app_id(file.id):
                raise PermissionDenied(f"App {session.app.id=} not allowed to {file.id}")
            id = await self.store(file)
            asset_ids.append(id)
        return asset_ids

    async def handle_download(self, session: Session, id: Identifier) -> Asset:
        if not session.is_app_id(id):
            raise PermissionDenied(f"App {session.app.id=} not allowed to {id}")
        asset = await self.retrieve(id)
        if asset is None:
            raise Exception(f"Asset {id} not found")
        return asset

    async def handle_download_many(self, session: Session, identifiers: list[Identifier]) -> list[Asset]:
        added_files: list[Asset] = []
        for id in identifiers:
            if not session.is_app_id(id):
                raise PermissionDenied(f"App {session.app.id=} not allowed to {id}")
            asset = await self.retrieve(id)
            if asset is None:
                raise Exception(f"Asset {id} not found")
            added_files.append(asset)
        return added_files

    async def handle_delete(self, session: Session, id: Identifier) -> None:
        if not session.is_app_id(id):
            raise PermissionDenied(f"App {session.app.id=} not allowed to {id}")
        path = self.index.lookup_asset_path(id)
        if path is None:
            raise Exception(f"Asset {id} not found")
        file_path = safe_path_join(self._path, path)
        file_path.unlink()
        self.index.delete(id)

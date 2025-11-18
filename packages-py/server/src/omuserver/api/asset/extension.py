from __future__ import annotations

import ipaddress
import secrets
import socket
import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING, Any

import aiohttp
from aiohttp import web
from loguru import logger
from omu.api.asset.extension import (
    ASSET_DELETE_ENDPOINT,
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_GENERATE_TOKEN_ENDPOINT,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
    Asset,
    GenerateAssetTokenResponse,
)
from omu.errors import PermissionDenied
from omu.identifier import Identifier
from yarl import URL

from omuserver.helper import safe_path_join
from omuserver.session import Session

from .permissions import (
    ASSET_PERMISSION,
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
        server.security.register_permission(ASSET_PERMISSION)
        server.endpoints.bind(ASSET_GENERATE_TOKEN_ENDPOINT, self.handle_generate_token)
        server.endpoints.bind(ASSET_UPLOAD_ENDPOINT, self.handle_upload)
        server.endpoints.bind(ASSET_UPLOAD_MANY_ENDPOINT, self.handle_upload_many)
        server.endpoints.bind(ASSET_DOWNLOAD_ENDPOINT, self.handle_download)
        server.endpoints.bind(ASSET_DOWNLOAD_MANY_ENDPOINT, self.handle_download_many)
        server.endpoints.bind(ASSET_DELETE_ENDPOINT, self.handle_delete)
        self.session_asset_tokens: dict[Identifier, str] = {}
        self.asset_tokens: set[str] = set()
        self.server = server
        self._path = server.directories.assets
        self.index = AssetIndex(self.server.directories.assets / "index.sqlite")
        server.network.route_get("/proxy", self._handle_proxy)
        server.network.route_get("/asset", self._handle_assets)

    def _verify_asset_token(self, request: web.Request):
        token = request.query.get("asset_token")
        if token is None:
            raise Exception("asset_token is not set")
        if token not in self.asset_tokens:
            raise Exception("Invalid asset_token was passed")

    async def _handle_proxy(self, request: web.Request) -> web.StreamResponse:
        self._verify_asset_token(request)
        url = request.query.get("url")
        if not url:
            return web.Response(status=400)
        url = URL(url)
        if url.host is None:
            raise Exception("Invalid url: host is not specified")
        ip_address = socket.gethostbyname(url.host)
        address = ipaddress.ip_address(ip_address)
        if address.is_private:
            return web.Response(status=403)
        no_cache = bool(request.query.get("no_cache"))
        try:
            async with self.server.client.get(
                url,
            ) as resp:
                headers = {
                    "Cache-Control": "no-cache" if no_cache else "max-age=3600",
                    "Content-Type": resp.content_type,
                    "Access-Control-Allow-Origin": "*",
                }
                response = web.StreamResponse(status=resp.status, headers=headers)
                await response.prepare(request)
                async for chunk in resp.content.iter_any():
                    await response.write(chunk)
                return response
        except TimeoutError:
            return web.Response(status=504)
        except aiohttp.ClientConnectionResetError:
            return web.Response(status=502)
        except aiohttp.ClientResponseError as e:
            return web.Response(status=e.status, text=e.message)
        except Exception:
            logger.error("Failed to proxy request")
            return web.Response(status=500)

    async def _handle_assets(self, request: web.Request) -> web.StreamResponse:
        self._verify_asset_token(request)
        id = request.query.get("id")
        if not id:
            return web.Response(status=400)
        identifier = Identifier.from_key(id)
        path = identifier.get_sanitized_path()
        try:
            path = safe_path_join(self.server.directories.assets, path)

            if not path.exists():
                return web.Response(status=404)
            return web.FileResponse(path)
        except Exception as e:
            logger.error(e)
            return web.Response(status=500)

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

    async def handle_generate_token(self, session: Session, args: Any) -> GenerateAssetTokenResponse:
        existing = self.session_asset_tokens.get(session.id)
        if existing:
            return {"token": existing}
        token = self.session_asset_tokens[session.id] = secrets.token_urlsafe()
        self.asset_tokens.add(token)
        return {"token": token}

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

from __future__ import annotations

import abc
import datetime
import json
import random
import sqlite3
import string
from collections.abc import Iterable
from typing import TYPE_CHECKING
from venv import logger

from omu import App
from omu.api.permission import PermissionType
from omu.app import AppType
from omu.identifier import Identifier
from omu.result import Err, Ok, Result, is_err
from yarl import URL

if TYPE_CHECKING:
    from omuserver.server import Server

type Token = str


class PermissionHandle(abc.ABC):
    @abc.abstractmethod
    def set_permissions(self, *permission_ids: Identifier) -> None: ...

    @abc.abstractmethod
    def has(self, permission_id: Identifier) -> bool: ...

    @abc.abstractmethod
    def has_any(self, permission_ids: Iterable[Identifier]) -> bool: ...

    @abc.abstractmethod
    def has_all(self, permission_ids: Iterable[Identifier]) -> bool: ...


class TokenGenerator:
    def __init__(self):
        self._chars = string.ascii_letters + string.digits

    def generate(self, length: int) -> str:
        return "".join(random.choices(self._chars, k=length))


class PermissionManager:
    def __init__(self, server: Server):
        self._server = server
        self._plugin_tokens: set[str] = set()
        self._token_generator = TokenGenerator()
        self.permissions: dict[Identifier, PermissionType] = {}
        self.token_permissions: dict[str, list[Identifier]] = {}
        self._token_db = sqlite3.connect(server.directories.get("security") / "tokens.sqlite")
        self._token_db.execute(
            """
            CREATE TABLE IF NOT EXISTS tokens (
                token TEXT PRIMARY KEY,
                identifier TEXT,
                created_at INTEGER,
                last_used_at INTEGER
                used_count INTEGER
            )
            """
        )
        self._token_db.execute(
            """
            CREATE TABLE IF NOT EXISTS remote_tokens (
                token TEXT PRIMARY KEY,
                identifier TEXT,
                app BLOB,
                created_at INTEGER,
                last_used_at INTEGER
                used_count INTEGER
            )
            """
        )
        self.token_permissions: dict[str, list[Identifier]] = {}
        permission_dir = server.directories.get("permissions")
        permission_dir.mkdir(parents=True, exist_ok=True)
        self.permission_db = sqlite3.connect(permission_dir / "permissions.db")
        self.permission_db.execute(
            """
            CREATE TABLE IF NOT EXISTS permissions (
                id TEXT PRIMARY KEY,
                value BLOB
            )
            """
        )
        self.frame_tokens: dict[str, Token] = {}
        self.permission_db.commit()
        self.load_permissions()

    def load_permissions(self) -> None:
        cursor = self.permission_db.cursor()
        cursor.execute("SELECT id, value FROM permissions")
        for row in cursor:
            token = row[0]
            permissions = json.loads(row[1])
            self.token_permissions[token] = [Identifier.from_key(key) for key in permissions]

    def store_permissions(self) -> None:
        cursor = self.permission_db.cursor()
        for token, permissions in self.token_permissions.items():
            permission_keys = [permission.key() for permission in permissions]
            permissions = json.dumps(permission_keys)
            cursor.execute(
                "INSERT OR REPLACE INTO permissions VALUES (?, ?)",
                (token, permissions),
            )
        self.permission_db.commit()

    def set_permissions(self, token: Token, *permission_ids: Identifier) -> None:
        self.token_permissions[token] = list(permission_ids)
        self.store_permissions()

    def register(self, *permission_types: PermissionType, overwrite: bool = False) -> None:
        for permission in permission_types:
            if permission.id in self.permissions and not overwrite:
                raise ValueError(f"Permission {permission.id} already registered")
            self.permissions[permission.id] = permission

    def unregister(self, *permission_types: PermissionType) -> None:
        for permission in permission_types:
            if permission.id in self.permissions:
                del self.permissions[permission.id]

    def get_permission(self, permission_id: Identifier) -> PermissionType | None:
        return self.permissions.get(permission_id)

    def has_permission(self, token: Token, permission_id: Identifier) -> bool:
        permissions = self.token_permissions.get(token)
        if permissions is None:
            return False
        return permission_id in permissions

    def generate_app_token(self, app: App) -> Token:
        token = self._token_generator.generate(32)
        self._token_db.execute(
            """
            INSERT INTO tokens (token, identifier, created_at, last_used_at, used_count)
            VALUES (?, ?, ?, ?, 0)
            """,
            (
                token,
                app.id.key(),
                datetime.datetime.now(),
                datetime.datetime.now(),
            ),
        )
        self._token_db.commit()
        return token

    def verify_app_token(self, app: App, token: Token) -> Result[tuple[PermissionHandle, Token], str]:
        if self._server.config.dashboard_token == token:
            return Ok((DashboardPermissionHandle(), token))
        cursor = self._token_db.execute(
            """
            SELECT token
            FROM tokens
            WHERE token = ? AND identifier = ?
            """,
            (token, app.id.key()),
        )
        result = cursor.fetchone()
        if result is None:
            return Err("Token not found")
        self._token_db.execute(
            """
            UPDATE tokens
            SET last_used_at = ?, used_count = used_count + 1
            WHERE token = ?
            """,
            (datetime.datetime.now(), token),
        )
        self._token_db.commit()
        return Ok((SessionPermissionHandle(self, token), token))

    def create_app_token(self, app: App) -> Result[tuple[PermissionHandle, Token], str]:
        token = self.generate_app_token(app)
        return Ok((SessionPermissionHandle(self, token), token))

    async def verify_token(self, app: App, token: str | None) -> Result[tuple[PermissionHandle, Token], str]:
        if app.type not in {
            AppType.DASHBOARD,
            AppType.PLUGIN,
            AppType.REMOTE,
        }:
            valid_type = app.type is None or app.type == AppType.APP
            if not valid_type:
                raise ValueError(f"Invalid app type: {app.type}")
            if token is None:
                return self.create_app_token(app)

            result = self.verify_app_token(app, token)
            if is_err(result):
                logger.warning(f"Generating new token for app {app} due to invalid token: {result.err}")
                return self.create_app_token(app)
            return result

        if token is None:
            return Err(f"App type {app.type} requires a token, but none provided")

        if app.type == AppType.DASHBOARD:
            return self.verify_dashboard_token(token)
        elif app.type == AppType.PLUGIN:
            return self.verify_plugin_token(token)
        elif app.type == AppType.REMOTE:
            return self.verify_remote_token(app, token)
        else:
            raise ValueError(f"Invalid app type: {app.type}")

    def verify_dashboard_token(self, token: Token) -> Result[tuple[PermissionHandle, Token], str]:
        dashboard_token = self._server.config.dashboard_token
        if dashboard_token is None:
            return Err("Dashboard token not set")
        if dashboard_token != token:
            return Err("Invalid dashboard token")
        return Ok((DashboardPermissionHandle(), token))

    def generate_remote_token(self, app: App) -> Token:
        token = self._token_generator.generate(32)
        self._token_db.execute(
            """
            INSERT INTO remote_tokens (token, identifier, app, created_at, last_used_at, used_count)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (
                token,
                app.id.key(),
                json.dumps(app.to_json()),
                datetime.datetime.now(),
                datetime.datetime.now(),
            ),
        )
        self._token_db.commit()
        return token

    def verify_remote_token(self, app: App, token: Token) -> Result[tuple[PermissionHandle, Token], str]:
        cursor = self._token_db.execute(
            """
            SELECT app
            FROM remote_tokens
            WHERE token = ? AND identifier = ?
            """,
            (token, app.id.key()),
        )
        result = cursor.fetchone()
        if result is None:
            return Err("Token not found")
        remote_app = App.from_json(json.loads(result[0]))
        if remote_app.url != app.url:
            return Err(f"URL mismatch: {remote_app.url} != {app.url}")
        if remote_app.metadata is None or app.metadata is None:
            return Err("Metadata mismatch")
        if [
            remote_app.metadata.get("locale"),
            remote_app.metadata.get("name"),
            remote_app.metadata.get("icon"),
            remote_app.metadata.get("description"),
        ] != [
            app.metadata.get("locale"),
            app.metadata.get("name"),
            app.metadata.get("icon"),
            app.metadata.get("description"),
        ]:
            return Err("Metadata mismatch")
        self._token_db.execute(
            """
            UPDATE remote_tokens
            SET last_used_at = ?, used_count = used_count + 1
            WHERE token = ?
            """,
            (datetime.datetime.now(), token),
        )
        return Ok((SessionPermissionHandle(self, token), token))

    def generate_plugin_token(self) -> Token:
        token = self._token_generator.generate(32)
        self._plugin_tokens.add(token)
        return token

    def verify_plugin_token(self, token: Token) -> Result[tuple[PermissionHandle, Token], str]:
        if token not in self._plugin_tokens:
            return Err("Invalid plugin token")
        return Ok((PluginPermissionHandle(), token))

    def generate_frame_token(self, url: str) -> Token:
        token = self._token_generator.generate(32)
        self.frame_tokens[token] = url
        return token

    def verify_frame_token(self, token: Token, url: str) -> bool:
        frame_url = self.frame_tokens.get(token)
        if frame_url is None:
            return False
        frame_url = URL(frame_url)
        parsed_url = URL(url)
        same_host = frame_url.host == parsed_url.host
        return same_host


class SessionPermissionHandle(PermissionHandle):
    def __init__(self, security: PermissionManager, token: Token):
        self._security = security
        self._token = token

    def set_permissions(self, *permission_ids: Identifier) -> None:
        self._security.set_permissions(self._token, *permission_ids)

    def has(self, permission_id: Identifier) -> bool:
        return self._security.has_permission(self._token, permission_id)

    def has_any(self, permission_ids: Iterable[Identifier]) -> bool:
        return any(self.has(permission_id) for permission_id in permission_ids)

    def has_all(self, permission_ids: Iterable[Identifier]) -> bool:
        return all(self.has(permission_id) for permission_id in permission_ids)


class PluginPermissionHandle(PermissionHandle):
    def set_permissions(self, *permission_ids: Identifier) -> None:
        pass

    def has(self, permission_id: Identifier) -> bool:
        return True

    def has_any(self, permission_ids: Iterable[Identifier]) -> bool:
        return True

    def has_all(self, permission_ids: Iterable[Identifier]) -> bool:
        return True


class DashboardPermissionHandle(PermissionHandle):
    def set_permissions(self, *permission_ids: Identifier) -> None:
        pass

    def has(self, permission_id: Identifier) -> bool:
        return True

    def has_any(self, permission_ids: Iterable[Identifier]) -> bool:
        return True

    def has_all(self, permission_ids: Iterable[Identifier]) -> bool:
        return True

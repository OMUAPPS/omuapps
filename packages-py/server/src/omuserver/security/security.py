import abc
import datetime
import json
import random
import sqlite3
import string
from collections.abc import Iterable

from loguru import logger
from omu import App
from omu.app import AppType
from omu.extension.permission.permission import PermissionType
from omu.identifier import Identifier
from result import Err, Ok, Result

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

    async def generate_app_token(self, app: App) -> Token:
        token = self._token_generator.generate(32)
        self._token_db.execute(
            """
            INSERT INTO tokens (token, identifier, created_at, last_used_at)
            VALUES (?, ?, ?, ?)
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

    async def validate_app_token(self, app: App, token: Token) -> bool:
        if self._server.config.dashboard_token == token:
            return True
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
            return False
        self._token_db.execute(
            """
            UPDATE tokens
            SET last_used_at = ?
            WHERE token = ?
            """,
            (datetime.datetime.now(), token),
        )
        return True

    async def verify_app_token(
        self, app: App, token: str | None
    ) -> Result[tuple[AppType, PermissionHandle, Token], str]:
        if app.type == AppType.DASHBOARD:
            if token is None:
                return Err("Dashboard token required, but none provided")
            if self.is_dashboard_token(token):
                return Ok((AppType.DASHBOARD, DashboardPermissionHandle(), token))
            return Err("Invalid dashboard token provided")
        elif app.type == AppType.PLUGIN:
            if token is None:
                return Err("Plugin token required, but none provided")
            if self.is_plugin_token(token):
                return Ok((AppType.PLUGIN, PluginPermissionHandle(), token))
            return Err("Invalid plugin token provided")
        elif app.type is None or app.type == AppType.APP:
            if token is None:
                token = await self.generate_app_token(app)
                return Ok((AppType.APP, SessionPermissionHandle(self, token), token))
            verified = await self.validate_app_token(app, token)
            if not verified:
                logger.warning(f"Generating new token for app {app} due to invalid token")
                token = await self.generate_app_token(app)
            return Ok((AppType.APP, SessionPermissionHandle(self, token), token))
        else:
            raise ValueError(f"Invalid app type: {app.type}")

    def is_dashboard_token(self, token: Token) -> bool:
        dashboard_token = self._server.config.dashboard_token
        if dashboard_token is None:
            return False
        return dashboard_token == token

    def generate_plugin_token(self) -> Token:
        token = self._token_generator.generate(32)
        self._plugin_tokens.add(token)
        return token

    def is_plugin_token(self, token: Token) -> bool:
        return token in self._plugin_tokens


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

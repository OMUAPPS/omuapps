from __future__ import annotations

import abc
import datetime
import hashlib
import json
import secrets
import urllib
import urllib.parse
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal, TypedDict

from aiohttp import web
from omu.api.permission.permission import PermissionType
from omu.app import App, AppJson, AppType
from omu.errors import DisconnectReason, InvalidOrigin
from omu.helper import map_optional
from omu.identifier import Identifier
from omu.result import Err, Ok, Result

if TYPE_CHECKING:
    from omuserver.server import Server


class InputToken(str): ...


class HashedToken(str): ...


class PermissionHandle(abc.ABC):
    @abc.abstractmethod
    def grant(self, permission_id: Identifier) -> None: ...

    def grant_all(self, permission_ids: Iterable[Identifier]) -> None:
        for permission_id in permission_ids:
            self.grant(permission_id)

    @abc.abstractmethod
    def revoke(self, permission_id: Identifier) -> None: ...

    def revoke_all(self, permission_ids: Iterable[Identifier]) -> None:
        for permission_id in permission_ids:
            self.revoke(permission_id)

    @abc.abstractmethod
    def has(self, permission_id: Identifier) -> bool: ...

    def has_any(self, permission_ids: Iterable[Identifier]) -> bool:
        return any(map(self.has, permission_ids))

    def has_all(self, permission_ids: Iterable[Identifier]) -> bool:
        return all(map(self.has, permission_ids))


class FullPermissionHandle(PermissionHandle):
    def grant(self, permission_id: Identifier) -> None:
        pass

    def revoke(self, permission_id: Identifier) -> None:
        pass

    def has(self, permission_id: Identifier) -> bool:
        return True


@dataclass
class ParentPermissionHandle(PermissionHandle):
    manager: PermissionManager
    id: Identifier
    token: HashedToken

    def grant(self, permission_id: Identifier) -> None:
        permissions = set(self.manager.apps[self.id]["permissions"])
        if permission_id.key() in permissions:
            return
        permissions.add(permission_id.key())
        self.manager.apps[self.id]["permissions"] = list(permissions)

    def revoke(self, permission_id: Identifier) -> None:
        permissions = self.manager.apps[self.id]["permissions"]
        if permission_id.key() not in permissions:
            return
        permissions.remove(permission_id.key())

    def has(self, permission_id: Identifier) -> bool:
        permissions = self.manager.apps[self.id]["permissions"]
        return permission_id.key() in permissions


@dataclass
class ChildPermissionHandle(PermissionHandle):
    manager: PermissionManager
    id: Identifier
    token: HashedToken
    parent: PermissionHandle

    def grant(self, permission_id: Identifier) -> None:
        permissions = set(self.manager.apps[self.id]["permissions"])
        if permission_id.key() in permissions:
            return
        permissions.add(permission_id.key())
        self.manager.apps[self.id]["permissions"] = list(permissions)

    def revoke(self, permission_id: Identifier) -> None:
        permissions = self.manager.apps[self.id]["permissions"]
        if permission_id.key() not in permissions:
            return
        permissions.remove(permission_id.key())

    def has(self, permission_id: Identifier) -> bool:
        permissions = self.manager.apps[self.id]["permissions"]
        if permission_id.key() not in permissions:
            return False
        return self.parent.has(permission_id)


class AppEntry(TypedDict):
    token: HashedToken
    salt: str
    identifier: str
    app_json: AppJson
    type: Literal["app", "remote", "plugin", "dashboard"]
    permissions: list[str]

    # Statistics
    created_at: float
    last_used_at: float
    used_count: int


@dataclass
class PermissionManager:
    server: Server
    apps: dict[Identifier, AppEntry]
    permissions: dict[Identifier, PermissionType]
    frame_tokens: dict[str, str] = field(default_factory=dict)
    plugin_tokens: list[str] = field(default_factory=list)

    @classmethod
    def load(cls, server: Server) -> PermissionManager:
        security_dir = server.directories.get("security")
        apps_path = security_dir / "apps.json"
        permissions_path = security_dir / "permissions.json"
        if apps_path.exists():
            apps = dict(json.loads(apps_path.read_text(encoding="utf-8")))
        else:
            apps = {}
        if permissions_path.exists():
            permissions = dict(json.loads(permissions_path.read_text(encoding="utf-8")))
        else:
            permissions = {}
        return PermissionManager(
            server,
            {Identifier.from_key(k): v for k, v in apps.items()},
            {Identifier.from_key(k): PermissionType.from_json(v) for k, v in permissions.items()},
        )

    def store(self):
        security_dir = self.server.directories.get("security")
        apps_json = json.dumps({k.key(): v for k, v in self.apps.items()}, ensure_ascii=False)
        permissions_json = json.dumps({k.key(): v.to_json() for k, v in self.permissions.items()}, ensure_ascii=False)
        (security_dir / "apps.json").write_text(apps_json, encoding="utf-8")
        (security_dir / "permissions.json").write_text(permissions_json, encoding="utf-8")

    def register_permission(self, *permissions: PermissionType, overwrite: bool = True) -> None:
        existing_permissions = list(filter(lambda perm: perm.id in self.permissions, permissions))
        if existing_permissions and not overwrite:
            raise ValueError(f"Permissions already registered: {', '.join(map(str, existing_permissions))}")
        for permission in permissions:
            self.permissions[permission.id] = permission

    def _random_token(self, length=32):
        return secrets.token_urlsafe(length)[:length]

    def generate_frame_token(self, url: str) -> str:
        token = self._random_token()
        self.frame_tokens[token] = url
        return token

    def generate_plugin_token(self) -> str:
        token = self._random_token()
        self.plugin_tokens.append(token)
        return token

    def generate_app_token(self, app: App) -> tuple[PermissionHandle, InputToken]:
        salt = self._random_token()
        input_token = InputToken(self._random_token())
        hash_obj = hashlib.sha256()
        hash_obj.update((salt + input_token).encode("utf-8"))
        hashed_token = HashedToken(hash_obj.hexdigest())
        entry: AppEntry = {
            "token": hashed_token,
            "salt": salt,
            "identifier": app.id.key(),
            "app_json": app.to_json(),
            "type": "app",
            "permissions": [],
            "created_at": datetime.datetime.now().timestamp(),
            "last_used_at": 0,
            "used_count": 0,
        }
        existing = self.apps.get(app.id)
        if existing is not None:
            entry["permissions"] = existing["permissions"]
        self.apps[app.id] = entry
        self.store()
        return (ParentPermissionHandle(self, app.id, hashed_token), input_token)

    def match_token(self, entry: AppEntry, token: InputToken) -> Result[HashedToken, str]:
        expected_token = entry["token"]
        hash_obj = hashlib.sha256()
        hash_obj.update((entry["salt"] + token).encode("utf-8"))
        hashed_token = hash_obj.hexdigest()
        token_matched = secrets.compare_digest(hashed_token, expected_token)
        if not token_matched:
            return Err("Token does not match")
        return Ok(expected_token)

    def verify_frame_token(self, request: web.Request) -> Result[None, DisconnectReason]:
        query = request.query
        frame_token = query.get("frame_token")
        url = query.get("url")
        origin = request.headers.get("Origin")
        if frame_token is None:
            return Err(InvalidOrigin("Missing frame token"))
        if origin is None:
            return Err(InvalidOrigin("Missing origin"))
        if url is None:
            return Err(InvalidOrigin("Missing url"))

        parsed_url = urllib.parse.unquote(url)
        token_matched = self.frame_tokens[frame_token] == parsed_url

        if not token_matched:
            return Err(InvalidOrigin("Invalid frame token"))
        return Ok(None)

    def verify_app(self, app: App, token: InputToken) -> Result[tuple[PermissionHandle, InputToken], str]:
        if app.type == AppType.DASHBOARD:
            token_matched = self.server.config.dashboard_token == token
            if not token_matched:
                return Err("Invalid token")
            return Ok((FullPermissionHandle(), token))
        if app.type == AppType.PLUGIN:
            token_matched = token in self.plugin_tokens
            if not token_matched:
                return Err("Invalid token")
            return Ok((FullPermissionHandle(), token))
        return self.verify_generic_app(app, token)

    def verify_generic_app(self, app: App, token: InputToken) -> Result[tuple[PermissionHandle, InputToken], str]:
        found_entry = self.apps.get(app.id)
        if found_entry is None:
            return Err(f"App {app.id} not found")
        token_result = self.match_token(found_entry, token)
        if token_result.is_err is True:
            return Err(f"Token mismatch for app {app.id}: {token_result.err}")

        match_result = self.match_app(found_entry["app_json"], app)
        if match_result.is_err is True:
            return Err(f"App data mismatch for app {app.id}: {match_result.err}")

        if app.parent_id:
            parent_entry = self.apps.get(app.parent_id)
            if parent_entry is None:
                return Err(f"Parent app {app.parent_id} not found")
            if parent_entry["app_json"]["parent_id"]:
                return Err("Child apps cannot have children")
            parent = ParentPermissionHandle(self, app.id, parent_entry["token"])
            child = ChildPermissionHandle(self, app.id, token_result.value, parent)
            return Ok((child, token))
        else:
            child = ParentPermissionHandle(self, app.id, token_result.value)
            return Ok((child, token))

    def match_app(self, a: AppJson, b: App) -> Result[..., str]:
        if a["id"] != b.id.key():
            return Err("App ID does not match")
        if a.get("parent_id") != map_optional(b.parent_id, Identifier.key):
            return Err("App parent ID does not match")
        if a.get("url") != b.url:
            return Err("App URL does not match")
        if a.get("type") != b.type.value:
            return Err("App type does not match")
        return Ok(...)

from __future__ import annotations

from typing import NotRequired, TypedDict

from omu.helper import map_optional
from omu.identifier import Identifier
from omu.interface import Keyable
from omu.model import Model

from .role import Role, RoleJson


class AuthorMetadata(TypedDict):
    url: NotRequired[str | None]
    screen_id: NotRequired[str | None]
    avatar_url: NotRequired[str | None]
    description: NotRequired[str | None]
    links: NotRequired[list[str] | None]


class AuthorJson(TypedDict):
    provider_id: str
    id: str
    metadata: AuthorMetadata
    name: NotRequired[str] | None
    avatar_url: NotRequired[str] | None
    roles: NotRequired[list[RoleJson]] | None


class Author(Keyable, Model[AuthorJson]):
    def __init__(
        self,
        *,
        provider_id: Identifier,
        id: Identifier,
        metadata: AuthorMetadata | None = None,
        name: str | None = None,
        avatar_url: str | None = None,
        roles: list[Role] | None = None,
    ) -> None:
        self.provider_id = provider_id
        self.id = id
        self.metadata = metadata or {}
        self.name = name
        self.avatar_url = avatar_url
        self.roles = roles or []

    def to_json(self) -> AuthorJson:
        return {
            "provider_id": self.provider_id.key(),
            "id": self.id.key(),
            "name": self.name,
            "avatar_url": self.avatar_url,
            "roles": [role.to_json() for role in self.roles],
            "metadata": self.metadata,
        }

    @classmethod
    def from_json(cls, json: AuthorJson) -> Author:
        return cls(
            provider_id=Identifier.from_key(json["provider_id"]),
            id=Identifier.from_key(json["id"]),
            name=json["name"],
            avatar_url=json.get("avatar_url"),
            roles=map_optional(
                json.get("roles"),
                lambda roles: list(map(Role.from_json, roles)),
                [],
            ),
            metadata=json.get("metadata", {}),
        )

    def key(self) -> str:
        return self.id.key()

    def __str__(self) -> str:
        return f"Author(id={self.id}, name={self.name})"

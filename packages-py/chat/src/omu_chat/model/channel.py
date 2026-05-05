from __future__ import annotations

from typing import TypedDict

from omu.identifier import Identifier
from omu.interface import Keyable
from omu.model import Model


class ChannelJson(TypedDict):
    provider_id: str
    id: str
    url: str
    name: str
    description: str | None
    active: bool
    icon_url: str | None


class Channel(Keyable, Model[ChannelJson]):
    def __init__(
        self,
        *,
        provider_id: Identifier,
        id: Identifier,
        url: str,
        name: str,
        description: str | None,
        active: bool,
        icon_url: str | None = None,
    ) -> None:
        self.provider_id = provider_id
        self.id = id
        self.url = url
        self.name = name
        self.description = description
        self.active = active
        self.icon_url = icon_url

    @classmethod
    def from_json(cls, json: ChannelJson) -> Channel:
        return cls(
            provider_id=Identifier.from_key(json["provider_id"]),
            id=Identifier.from_key(json["id"]),
            url=json["url"],
            name=json["name"],
            description=json["description"],
            active=json["active"],
            icon_url=json["icon_url"],
        )

    def to_json(self) -> ChannelJson:
        return ChannelJson(
            provider_id=self.provider_id.key(),
            id=self.id.key(),
            url=self.url,
            name=self.name,
            description=self.description,
            active=self.active,
            icon_url=self.icon_url,
        )

    def key(self) -> str:
        return self.id.key()

    def __repr__(self):
        return f"Channel({self.provider_id}, {self.url}, {self.name})"

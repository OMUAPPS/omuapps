from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import NotRequired, TypedDict

from omu.helper import map_optional
from omu.identifier import Identifier
from omu.interface import Keyable
from omu.model import Model

from . import content
from .gift import Gift, GiftJson
from .paid import Paid, PaidJson


class MessageJson(TypedDict):
    room_id: str
    id: str
    author_id: NotRequired[str] | None
    content: NotRequired[content.ComponentJson] | None
    paid: NotRequired[PaidJson] | None
    gifts: NotRequired[list[GiftJson]] | None
    created_at: NotRequired[str] | None  # ISO 8601 date string
    deleted: NotRequired[bool]


@dataclass(slots=True)
class Message(Keyable, Model[MessageJson]):
    room_id: Identifier
    id: Identifier
    author_id: Identifier | None = None
    content: content.Component | None = None
    paid: Paid | None = None
    gifts: list[Gift] | None = None
    created_at: datetime | None = None
    deleted: bool = False

    @classmethod
    def from_json(cls, json: MessageJson) -> Message:
        created_at = None
        if json.get("created_at") and json["created_at"]:
            created_at = datetime.fromisoformat(json["created_at"])

        return cls(
            room_id=Identifier.from_key(json["room_id"]),
            id=Identifier.from_key(json["id"]),
            author_id=map_optional(json.get("author_id"), Identifier.from_key),
            content=map_optional(json.get("content"), content.deserialize),
            paid=map_optional(json.get("paid"), Paid.from_json),
            gifts=map_optional(
                json.get("gifts"),
                lambda gifts: list(map(Gift.from_json, gifts)),
                [],
            ),
            created_at=created_at,
            deleted=json.get("deleted", False),
        )

    def to_json(self) -> MessageJson:
        return MessageJson(
            room_id=self.room_id.key(),
            id=self.id.key(),
            author_id=map_optional(self.author_id, Identifier.key),
            content=map_optional(self.content, content.serialize),
            paid=map_optional(self.paid, Paid.to_json),
            gifts=map_optional(
                self.gifts, lambda gifts: [gift.to_json() for gift in gifts]
            ),
            created_at=map_optional(self.created_at, lambda x: x.isoformat()),
            deleted=self.deleted,
        )

    @property
    def text(self) -> str:
        if not self.content:
            return ""
        return str(self.content)

    def key(self) -> str:
        return self.id.key()

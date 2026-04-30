from __future__ import annotations

from collections.abc import Hashable
from datetime import datetime
from typing import Literal, NotRequired, TypedDict

from omu.helper import map_optional
from omu.identifier import Identifier
from omu.interface import Keyable
from omu.model import Model


class RoomMetadata(TypedDict):
    url: NotRequired[str]
    title: NotRequired[str]
    description: NotRequired[str]
    thumbnail: NotRequired[str]
    viewers: NotRequired[int]
    created_at: NotRequired[str]
    started_at: NotRequired[str]
    ended_at: NotRequired[str]
    first_message_id: NotRequired[str]
    last_message_id: NotRequired[str]
    likes: NotRequired[int]


type Status = Literal["online", "reserved", "offline"]


class RoomJson(TypedDict):
    id: str
    provider_id: str
    connected: bool
    status: Status
    metadata: RoomMetadata
    channel_id: NotRequired[str] | None
    created_at: NotRequired[str] | None  # ISO 8601 date string


class Room(Keyable, Model[RoomJson], Hashable):
    def __init__(
        self,
        *,
        id: Identifier,
        provider_id: Identifier,
        connected: bool,
        status: Status,
        metadata: RoomMetadata,
        channel_id: Identifier | None = None,
        created_at: datetime | None = None,
    ) -> None:
        self.id = id
        self.provider_id = provider_id
        self.connected = connected
        self.status: Status = status
        self.metadata = metadata
        self.channel_id = channel_id
        self.created_at = created_at

    @classmethod
    def from_json(cls, json: RoomJson) -> Room:
        return Room(
            id=Identifier.from_key(json["id"]),
            provider_id=Identifier.from_key(json["provider_id"]),
            connected=json["connected"],
            status=json["status"],
            metadata=json["metadata"],
            channel_id=map_optional(json.get("channel_id"), Identifier.from_key),
            created_at=map_optional(json.get("created_at"), datetime.fromisoformat),
        )

    def to_json(self) -> RoomJson:
        return RoomJson(
            id=self.id.key(),
            provider_id=self.provider_id.key(),
            connected=self.connected,
            status=self.status,
            metadata=self.metadata,
            channel_id=map_optional(self.channel_id, Identifier.key),
            created_at=map_optional(self.created_at, datetime.isoformat),
        )

    def key(self) -> str:
        return self.id.key()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Room):
            return NotImplemented
        return self.key() == other.key()

    def __hash__(self) -> int:
        return hash(self.key())

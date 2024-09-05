from __future__ import annotations

from collections.abc import Callable

from omu import Omu
from omu.extension.endpoint import EndpointType
from omu.extension.signal.signal import SignalPermissions, SignalType
from omu.extension.table import TablePermissions, TableType
from omu.serializer import Serializer

from omu_chat.const import IDENTIFIER
from omu_chat.event.event import EventHandler, EventRegistry, EventSource
from omu_chat.model import Author, Channel, Message, Provider, Reaction, Room, Vote
from omu_chat.permissions import (
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    CHAT_PERMISSION_ID,
    CHAT_READ_PERMISSION_ID,
    CHAT_WRITE_PERMISSION_ID,
)

MESSAGE_TABLE = TableType.create_model(
    IDENTIFIER,
    "messages",
    Message,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
AUTHOR_TABLE = TableType.create_model(
    IDENTIFIER,
    "authors",
    Author,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
CHANNEL_TABLE = TableType.create_model(
    IDENTIFIER,
    "channels",
    Channel,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
PROVIDER_TABLE = TableType.create_model(
    IDENTIFIER,
    "providers",
    Provider,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
ROOM_TABLE = TableType.create_model(
    IDENTIFIER,
    "rooms",
    Room,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
VOTE_TABLE = TableType.create_model(
    IDENTIFIER,
    "votes",
    Vote,
    permissions=TablePermissions(
        all=CHAT_PERMISSION_ID,
        read=CHAT_READ_PERMISSION_ID,
        write=CHAT_WRITE_PERMISSION_ID,
    ),
)
CREATE_CHANNEL_TREE_ENDPOINT = EndpointType[str, list[Channel]].create_json(
    IDENTIFIER,
    "create_channel_tree",
    response_serializer=Serializer.model(Channel).to_array(),
    permission_id=CHAT_CHANNEL_TREE_PERMISSION_ID,
)
REACTION_SIGNAL = SignalType[Reaction].create_json(
    IDENTIFIER,
    "reaction",
    serializer=Serializer.model(Reaction),
    permissions=SignalPermissions(
        all=CHAT_PERMISSION_ID,
        listen=CHAT_READ_PERMISSION_ID,
        notify=CHAT_WRITE_PERMISSION_ID,
    ),
)


class Chat:
    def __init__(
        self,
        omu: Omu,
    ):
        omu.server.require(IDENTIFIER)
        omu.permissions.require(CHAT_PERMISSION_ID)
        self.messages = omu.tables.get(MESSAGE_TABLE)
        self.authors = omu.tables.get(AUTHOR_TABLE)
        self.channels = omu.tables.get(CHANNEL_TABLE)
        self.providers = omu.tables.get(PROVIDER_TABLE)
        self.rooms = omu.tables.get(ROOM_TABLE)
        self.votes = omu.tables.get(VOTE_TABLE)
        self.reaction_signal = omu.signals.get(REACTION_SIGNAL)
        self.event_registry = EventRegistry(self)

    def on[**P](
        self, event: EventSource[P]
    ) -> Callable[[EventHandler[P]], EventHandler[P]]:
        def decorator(listener: EventHandler[P]) -> EventHandler[P]:
            self.event_registry.register(event, listener)
            return listener

        return decorator

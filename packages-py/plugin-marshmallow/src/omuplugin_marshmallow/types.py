from collections.abc import Mapping
from typing import TypedDict

from omu.extension.endpoint import EndpointType

from .const import PLUGIN_ID


class User(TypedDict):
    name: str
    screen_name: str
    image: str


GET_USERS_ENDPOINT_TYPE = EndpointType[None, Mapping[str, User]].create_json(
    PLUGIN_ID,
    "get_users",
)

REFRESH_USERS_ENDPOINT_TYPE = EndpointType[None, Mapping[str, User]].create_json(
    PLUGIN_ID,
    "refresh_users",
)


class Message(TypedDict):
    message_id: str
    liked: bool
    acknowledged: bool
    content: str


GET_MESSAGES_ENDPOINT_TYPE = EndpointType[str, list[Message]].create_json(
    PLUGIN_ID,
    "get_messages",
)


class SetLiked(TypedDict):
    user_id: str
    message_id: str
    liked: bool


SET_LIKED_ENDPOINT_TYPE = EndpointType[SetLiked, Message].create_json(
    PLUGIN_ID,
    "set_liked",
)


class SetAcknowledged(TypedDict):
    user_id: str
    message_id: str
    acknowledged: bool


SET_ACKNOWLEDGED_ENDPOINT_TYPE = EndpointType[SetAcknowledged, Message].create_json(
    PLUGIN_ID,
    "set_acknowledged",
)


class SetReply(TypedDict):
    user_id: str
    message_id: str
    reply: str


SET_REPLY_ENDPOINT_TYPE = EndpointType[SetReply, Message].create_json(
    PLUGIN_ID,
    "set_reply",
)

from collections.abc import Mapping
from typing import NotRequired, TypedDict

from omu.extension.endpoint import EndpointType

from .const import PLUGIN_ID


class User(TypedDict):
    name: str
    screen_name: str
    image: str
    premium: bool


class Message(TypedDict):
    message_id: str
    liked: bool
    acknowledged: bool
    content: str
    replied: NotRequired[bool]


class SetLiked(TypedDict):
    user_id: str
    message_id: str
    liked: bool


class SetAcknowledged(TypedDict):
    user_id: str
    message_id: str
    acknowledged: bool


class SetReply(TypedDict):
    user_id: str
    message_id: str
    reply: str


GET_USERS_ENDPOINT_TYPE = EndpointType[None, Mapping[str, User]].create_json(
    PLUGIN_ID,
    "get_users",
)
REFRESH_USERS_ENDPOINT_TYPE = EndpointType[None, Mapping[str, User]].create_json(
    PLUGIN_ID,
    "refresh_users",
)
GET_MESSAGES_ENDPOINT_TYPE = EndpointType[str, list[Message]].create_json(
    PLUGIN_ID,
    "get_messages",
)
SET_LIKED_ENDPOINT_TYPE = EndpointType[SetLiked, Message].create_json(
    PLUGIN_ID,
    "set_liked",
)
SET_ACKNOWLEDGED_ENDPOINT_TYPE = EndpointType[SetAcknowledged, Message].create_json(
    PLUGIN_ID,
    "set_acknowledged",
)
SET_REPLY_ENDPOINT_TYPE = EndpointType[SetReply, Message].create_json(
    PLUGIN_ID,
    "set_reply",
)

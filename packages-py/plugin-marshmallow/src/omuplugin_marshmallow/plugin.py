from loguru import logger
from marshmallowqa import MarshmallowSession, MessageDetail, retrieve_cookies
from marshmallowqa.errors import MarshmallowLoginError
from omu import Omu

from .const import APP
from .types import (
    GET_MESSAGES_ENDPOINT_TYPE,
    GET_USERS_ENDPOINT_TYPE,
    REFRESH_USERS_ENDPOINT_TYPE,
    SET_ACKNOWLEDGED_ENDPOINT_TYPE,
    SET_LIKED_ENDPOINT_TYPE,
    SET_REPLY_ENDPOINT_TYPE,
    Message,
    SetAcknowledged,
    SetLiked,
    SetReply,
    User,
)

omu = Omu(APP)
sessions: dict[str, MarshmallowSession] = {}
users: dict[str, User] = {}


@omu.endpoints.bind(endpoint_type=GET_MESSAGES_ENDPOINT_TYPE)
async def get_messages(user: str) -> list[Message]:
    marshmallow = sessions[user]
    fetched = await marshmallow.fetch_messages()
    return [Message(**message.model_dump()) for message in fetched]


@omu.endpoints.bind(endpoint_type=GET_USERS_ENDPOINT_TYPE)
async def get_users(_):
    if not sessions:
        await refresh_sessions()
    return users


@omu.endpoints.bind(endpoint_type=REFRESH_USERS_ENDPOINT_TYPE)
async def refresh_users(_):
    await refresh_sessions()
    return users


async def refresh_sessions():
    cookies = retrieve_cookies(domain="marshmallow-qa.com")
    sessions.clear()
    users.clear()
    for browser in cookies:
        try:
            marshmallow = await MarshmallowSession.from_cookies(
                cookies=cookies[browser],
            )
            user = await marshmallow.fetch_user()
            sessions[user.name] = marshmallow
            users[user.name] = User(**user.model_dump())
        except MarshmallowLoginError as e:
            logger.opt(exception=e).error(f"User {browser} could not be logged in")


@omu.endpoints.bind(endpoint_type=SET_LIKED_ENDPOINT_TYPE)
async def set_liked(set_liked: SetLiked) -> Message:
    session = sessions[set_liked["user_id"]]
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_liked["message_id"],
    )
    await detail.like(session, liked=set_liked["liked"])
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_liked["message_id"],
    )
    return Message(
        message_id=detail.message_id,
        content=detail.content,
        liked=detail.liked,
        acknowledged=detail.acknowledged,
    )


@omu.endpoints.bind(endpoint_type=SET_ACKNOWLEDGED_ENDPOINT_TYPE)
async def set_acknowledged(set_acknowledged: SetAcknowledged) -> Message:
    session = sessions[set_acknowledged["user_id"]]
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_acknowledged["message_id"],
    )
    await detail.acknowledge(session, acknowledged=set_acknowledged["acknowledged"])
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_acknowledged["message_id"],
    )
    return Message(
        message_id=detail.message_id,
        content=detail.content,
        liked=detail.liked,
        acknowledged=detail.acknowledged,
    )


@omu.endpoints.bind(endpoint_type=SET_REPLY_ENDPOINT_TYPE)
async def set_reply(set_reply: SetReply) -> Message:
    session = sessions[set_reply["user_id"]]
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_reply["message_id"],
    )
    if detail.replied:
        await detail.try_edit_reply(session, content=set_reply["reply"])
    else:
        await detail.reply(session, content=set_reply["reply"])
    detail = await MessageDetail.from_id(
        marshmallow=session,
        message_id=set_reply["message_id"],
    )
    return Message(
        message_id=detail.message_id,
        content=detail.content,
        liked=detail.liked,
        acknowledged=detail.acknowledged,
    )


@omu.on_ready
async def on_ready():
    await refresh_sessions()

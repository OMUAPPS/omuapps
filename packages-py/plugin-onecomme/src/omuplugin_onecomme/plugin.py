from __future__ import annotations

import asyncio
import socket
from html import escape
from typing import TypedDict

from aiohttp import web
from loguru import logger
from omu import App, Omu
from omu.app import AppType
from omu_chat import Chat, events, model
from omu_chat.model import content

from .types import Badge, Comment, CommentData, CommentServiceData
from .version import VERSION

APP = App(
    id="com.omuapps:onecomme/plugin",
    type=AppType.PLUGIN,
    version=VERSION,
)
client = Omu(APP)
chat = Chat(client)
app = web.Application()


def format_content(*components: content.Component | None) -> str:
    if components is None:
        return ""
    if len(components) == 0:
        return ""
    parts = []
    stack = [*components]
    while stack:
        component = stack.pop(0)
        if isinstance(component, content.Log):
            continue
        elif isinstance(component, content.Text):
            parts.append(escape(component.text))
        elif isinstance(component, content.Image):
            parts.append(
                f'<img src="{escape(component.url)}" alt="{escape(component.id)}">'
            )
        elif isinstance(component, content.Link):
            parts.append(
                f'<a href="{component.url}">{format_content(*component.children)}</a>'
            )
        elif isinstance(component, content.System):
            parts.append(
                f"<div><span>{format_content(*component.get_children())}</span></div>"
            )
        elif isinstance(component, content.Parent):
            parts.append(f"<span>{format_content(*component.get_children())}</span>")
        else:
            logger.warning("Unknown component: %s", component)
    return "".join(parts)


async def to_comment(message: model.Message) -> Comment | None:
    room = await chat.rooms.get(message.room_id.key())
    author: model.Author | None = None
    if message.author_id:
        author = await chat.authors.get(message.author_id.key())
    if not room or not author:
        return None
    metadata = room.metadata or {}
    badges = []
    for badge in author.roles:
        if badge.icon_url:
            badges.append(
                Badge(
                    label=badge.name,
                    url=badge.icon_url,
                )
            )
    return Comment(
        id=room.key(),
        service=room.provider_id.key(),
        name=metadata.get("title", ""),
        url=metadata.get("url", ""),
        color={"r": 190, "g": 44, "b": 255},
        data=CommentData(
            id=message.key(),
            liveId=room.id.key(),
            userId=author.key(),
            name=author.name or "",
            screenName=author.name or "",
            hasGift=False,
            isOwner=False,
            isAnonymous=False,
            profileImage=author.avatar_url or "",
            badges=badges,
            timestamp=message.created_at and message.created_at.isoformat() or "",
            comment=format_content(message.content),
            displayName=author.name or "",
            originalProfileImage=author.avatar_url or "",
            isFirstTime=False,
        ),
        meta={"no": 1, "tc": 1},
        serviceData=CommentServiceData(
            id=room.key(),
            name=metadata.get("title", ""),
            url=metadata.get("url", ""),
            write=True,
            speech=False,
            options={},
            enabled=False,
            persist=False,
            translate=[],
            color={"r": 190, "g": 44, "b": 255},
        ),
    )


class CommentsData(TypedDict):
    comments: list[Comment]


sessions: set[web.WebSocketResponse] = set()


async def handle(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    fetched_messages = await chat.messages.fetch_items(limit=35, backward=True)
    comments = [await to_comment(message) for message in (fetched_messages).values()]
    await ws.send_json(
        {
            "type": "connected",
            "data": CommentsData(
                comments=list(reversed(tuple(filter(None, comments))))
            ),
        }
    )
    sessions.add(ws)
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                pass
            elif msg.type == web.WSMsgType.ERROR:
                logger.error("ws connection closed with exception %s", ws.exception())
    finally:
        sessions.remove(ws)
    return ws


@chat.on(events.message.add)
async def on_message_add(message: model.Message) -> None:
    comment = await to_comment(message)
    if not comment:
        return
    for ws in sessions:
        await ws.send_json(
            {
                "type": "comments",
                "data": CommentsData(
                    comments=[comment],
                ),
            }
        )


@chat.on(events.message.update)
async def on_message_update(message: model.Message) -> None:
    comment = await to_comment(message)
    if comment is None:
        return
    for ws in sessions:
        await ws.send_json(
            {
                "type": "comments",
                "data": CommentsData(
                    comments=[comment],
                ),
            }
        )


@chat.on(events.message.remove)
async def on_message_delete(message: model.Message) -> None:
    for ws in sessions:
        await ws.send_json({"type": "deleted", "data": [message.key()]})


def is_port_free() -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(
                (
                    "localhost",
                    11180,
                )
            )
            return True
    except OSError:
        return False


@client.event.ready.listen
async def on_ready():
    port_free = is_port_free()
    if not port_free:
        raise OSError("Port 11180 already in use")
    app.add_routes([web.get("/sub", handle)])
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "localhost", 11180)
    asyncio.create_task(site.start())
    logger.info("OneComme server started")


if __name__ == "__main__":
    client.run()

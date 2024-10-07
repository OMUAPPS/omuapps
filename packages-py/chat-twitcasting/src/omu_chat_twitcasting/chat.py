from __future__ import annotations

import asyncio
import random
import string
import time
from datetime import datetime

import aiohttp
from aiohttp import WSMsgType
from loguru import logger
from omu.identifier import Identifier
from omu_chat.chat import Chat
from omu_chat.model import Author, Channel, Message, Room
from omu_chat.model.content import Root, Text
from omu_chat.model.gift import Gift
from omu_chatprovider.service import ChatService
from omu_chatprovider.tasks import Tasks
from yarl import URL

from .const import PROVIDER
from .types import events, types


class TwitcastingChat(ChatService):
    def __init__(
        self,
        session: aiohttp.ClientSession,
        chat: Chat,
        room: Room,
        channel: Channel,
    ):
        self.session = session
        self.movie_id = room.id.path[-1]
        self.chat = chat
        self._room = room
        self.channel = channel
        self._closed = False
        self.tasks = Tasks(asyncio.get_event_loop())

    @property
    def room(self) -> Room:
        return self._room

    @property
    def closed(self) -> bool:
        return self._closed

    async def run(self):
        while True:
            socket = await self.create_socket()
            self.room.status = "online"
            await self.chat.rooms.update(self.room)
            await self.listen(socket)
            self.room.status = "offline"
            await self.chat.rooms.update(self.room)

    async def create_socket(self):
        socket = await self.session.ws_connect(
            await self.fetch_ws(),
            params={
                "gift": "1",
            },
        )
        return socket

    async def listen(self, socket: aiohttp.ClientWebSocketResponse):
        while True:
            message = await socket.receive()
            if message.type == WSMsgType.CLOSED:
                break
            if message.type == WSMsgType.ERROR:
                break
            if message.type == WSMsgType.CLOSE:
                break
            data = message.json()
            authors: list[Author] = []
            messages: list[Message] = []
            for event in self.validate_event(data):
                await self.process_message(event, authors, messages)
            if len(authors) > 0:
                new_authors = [
                    author
                    for author in authors
                    if await self.chat.authors.get(author.id.key()) is None
                ]
                await self.chat.authors.add(*new_authors)
            if len(messages) > 0:
                await self.chat.messages.add(*messages)

    def validate_event(self, data: events.EventJson) -> list[events.Event]:
        if not isinstance(data, list):
            logger.warning(f"Invalid event: {data}")
            return []
        return data

    async def process_message(
        self,
        event: events.Event,
        authors: list[Author],
        messages: list[Message],
    ):
        if event["type"] == "comment":
            author = await self._parse_sender(event["author"])
            created_at = self._parse_created_at(event)
            message = Message(
                id=self.room.id / str(event["id"]),
                room_id=self.room.id,
                content=Root([Text.of(event["message"])]),
                author_id=author.id,
                created_at=created_at,
            )
            authors.append(author)
            messages.append(message)
        elif event["type"] == "gift":
            author = await self._parse_sender(event["sender"])
            created_at = self._parse_created_at(event)
            gifts = [
                self._parse_item(event["item"]),
                *self._parse_items(event.get("score_items", [])),
            ]
            message = Message(
                id=self.room.id / str(event["id"]),
                room_id=self.room.id,
                content=Root([Text.of(event["message"])]),
                author_id=author.id,
                created_at=created_at,
                gifts=gifts,
            )
            authors.append(author)
            messages.append(message)
        else:
            raise Exception(f"Unknown event type: {event['type']}")

    def _parse_item(self, item: events.Item) -> Gift:
        return Gift(
            id=item["name"],
            name=item["name"],
            amount=1,
            image_url=self.get_full_url(item["image"]),
            is_paid=False,
        )

    def get_full_url(self, path: str) -> str:
        url = URL(path)
        return str(
            URL.build(
                scheme=url.scheme or "https",
                host=url.host or "s01.twitcasting.tv",
                path=url.path,
            )
        )

    def _parse_items(self, items: list[events.ScoreItem]) -> list[Gift]:
        gifts = []
        for item in items:
            amount = 1
            if item["text"] and item["text"].isdigit():
                amount = int(item["text"])
            gifts.append(
                Gift(
                    id=item["title"],
                    name=item["title"],
                    amount=amount,
                    is_paid=False,
                )
            )
        return gifts

    async def _parse_sender(self, sender: events.Sender) -> Author:
        author = Author(
            id=self.get_sender_id(self.channel.id, sender["id"]),
            provider_id=PROVIDER.id,
            name=sender["name"],
            avatar_url=sender["profileImage"],
            metadata={
                "url": f"https://twitcasting.tv/{sender['id']}",
            },
        )
        return author

    def get_sender_id(self, channel_id: Identifier, sender_id: str) -> Identifier:
        """
        c:channel_id -> c/channel_id
        channel_id -> _/channel_id
        """
        if ":" not in sender_id:
            return channel_id / "_" / sender_id
        type, id = sender_id.split(":", 1)
        if ":" in id:
            raise Exception(f"Invalid sender id: {sender_id}")
        return channel_id / type / id

    def _parse_created_at(self, event: events.Event) -> datetime:
        created_at = datetime.fromtimestamp(event["createdAt"] / 1000)
        return created_at

    async def fetch_ws(self) -> str:
        key = "WebKitFormBoundary" + "".join(
            random.choices(string.ascii_letters + string.digits, k=16)
        )
        n = int(time.time() * 1000)
        form_data = f"""------{key}
Content-Disposition: form-data; name="movie_id"

{self.movie_id}
------{key}
Content-Disposition: form-data; name="__n"

{n}
------{key}
Content-Disposition: form-data; name="password"


------{key}--"""
        res = await self.session.post(
            "https://twitcasting.tv/eventpubsuburl.php",
            data=form_data,
            headers={
                "Content-Type": f"multipart/form-data; boundary=----{key}",
            },
        )
        data: types.EventPubSubUrl = await res.json()
        return data["url"]

    async def stop(self):
        self.tasks.terminate()
        self.room.status = "offline"
        await self.chat.rooms.update(self.room)

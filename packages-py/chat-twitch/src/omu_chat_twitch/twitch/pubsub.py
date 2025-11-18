from __future__ import annotations

import abc
import asyncio
import json
import random
import string
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Literal, LiteralString, NotRequired, TypedDict

from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType
from loguru import logger

from ..const import BASE_HEADERS
from .api import TwitchAPI

type Coro[**P, R] = Callable[P, Awaitable[R]]


def generate_id() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=21))


class Packet[T: LiteralString](TypedDict):
    type: T
    error: NotRequired[str]


class Communication[D](TypedDict):
    data: D


class C2SPing(Packet[Literal["PING"]]): ...


class S2CPong(Packet[Literal["PONG"]]): ...


class ListenData(TypedDict):
    topics: list[str]


class C2SListen(Packet[Literal["LISTEN"]], Communication[ListenData]): ...


# {
#     "data": {"topics": ["stream-chat-room-v1.41952329"]},
#     "nonce": "Yd9upVa6dmCYAu0dDvV9ho0jSbNpIy",
#     "type": "UNLISTEN",
# }
class UnlistenData(TypedDict):
    topics: list[str]


class C2SUnlisten(Packet[Literal["UNLISTEN"]], Communication[UnlistenData]): ...


class S2CResponse(Packet[Literal["RESPONSE"]], Communication[NotRequired[str]]): ...


class MessageData(TypedDict):
    topic: str
    message: str


class S2CMessage(Packet[Literal["MESSAGE"]], Communication[MessageData]): ...


type C2SPacket = C2SPing | C2SListen | C2SUnlisten
type S2CPacket = S2CPong | S2CResponse | S2CMessage


class TopicHandle(abc.ABC):
    def __init__(self, pubsub: TwitchPubSub, topic_key: str):
        self.pubsub = pubsub
        self.topic_key = topic_key

    @abc.abstractmethod
    async def handle(self, msg: S2CMessage) -> None:
        raise NotImplementedError


class ChannelTopicHandle[T: LiteralString, D](TopicHandle):
    def __init__(self, pubsub: TwitchPubSub, topic: T, channel_id: int):
        super().__init__(pubsub, f"{topic}.{channel_id}")
        self.topic = topic
        self.channel_id = channel_id
        self.listeners: list[Coro[[ChannelTopicHandle, D], None]] = []

    async def create(self, pubsub: TwitchPubSub, channel_id: int) -> ChannelTopicHandle[T, D]:
        return ChannelTopicHandle(pubsub, self.topic, channel_id)

    def subscribe(self, listener: Coro[[ChannelTopicHandle, D], None]) -> Coro[[ChannelTopicHandle, D], None]:
        self.listeners.append(listener)
        return listener

    async def unsubscribe(self) -> None:
        await self.pubsub.unsubscribe_topic(self)

    async def handle(self, msg: S2CMessage) -> None:
        topic: T = msg["data"]["topic"]  # type: ignore
        if topic != self.topic_key:
            logger.error("Received message for wrong topic: {}", topic)
            return
        try:
            message: D = json.loads(msg["data"]["message"])
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to decode message: {msg}") from e
        for listener in self.listeners:
            await listener(self, message)


class PubSubMessage[T: LiteralString](TypedDict):
    type: T


class BroadcastSettingsUpdate(PubSubMessage[Literal["broadcast_settings_update"]]):
    # {
    #     "channel_id": "824516405",
    #     "type": "broadcast_settings_update",
    #     "channel": "a230am",
    #     "old_status": "さぎょ",
    #     "status": "さぎょaaaaa",
    #     "old_game": "",
    #     "game": "",
    #     "old_game_id": 0,
    #     "game_id": 0,
    # }
    channel_id: str
    channel: str
    old_status: str
    status: str
    old_game: str
    game: str
    old_game_id: int | Literal[0]
    game_id: int | Literal[0]


class StreamUp(PubSubMessage[Literal["stream-up"]]):
    # {
    #     "server_time": 1741539024,
    #     "play_delay": 0,
    #     "type": "stream-up",
    # }
    server_time: int
    play_delay: int


class StreamDown(PubSubMessage[Literal["stream-down"]]):
    # {
    #     "server_time": 1741539035,
    #     "type": "stream-down",
    # }
    server_time: int


class ViewCount(PubSubMessage[Literal["viewcount"]]):
    # {
    #     "type": "viewcount",
    #     "server_time": 1741538601.580584,
    #     "viewers": 9528,
    #     "collaboration_status": "none",
    #     "collaboration_viewers": 0,
    # }
    server_time: float
    viewers: int
    collaboration_status: str | Literal["none"]
    collaboration_viewers: int


@dataclass(frozen=True)
class PubSubTopic[T: LiteralString, D]:
    topic: T

    async def create(self, pubsub: TwitchPubSub, channel_id: int) -> ChannelTopicHandle[T, D]:
        channel_topic = ChannelTopicHandle(pubsub, self.topic, channel_id)
        await pubsub.subscribe_topic(channel_topic)
        return channel_topic


type VideoPlaybackById = StreamUp | StreamDown | ViewCount


class PubSubTopics:
    broadcast_settings_update = PubSubTopic[
        Literal["broadcast-settings-update"],
        BroadcastSettingsUpdate,
    ]("broadcast-settings-update")
    video_playback_by_id = PubSubTopic[
        Literal["video-playback-by-id"],
        VideoPlaybackById,
    ]("video-playback-by-id")


class TwitchPubSub:
    def __init__(
        self,
        api: TwitchAPI,
        session: ClientSession,
    ):
        self.api = api
        self.session = session

        self.handlers: dict[str, Coro[[Any], None]] = {
            "PONG": self.handle_pong,
            "RESPONSE": self.handle_response,
            "MESSAGE": self.handle_message,
        }
        self.subscriptions: dict[str, TopicHandle] = {}
        self.socket: ClientWebSocketResponse | None = None
        self.ping_task: asyncio.Task | None = None
        self.handle_future: asyncio.Future[None] | None = None

    @classmethod
    async def create(
        cls,
        api: TwitchAPI,
        session: ClientSession | None = None,
    ) -> TwitchPubSub:
        if session is None:
            session = ClientSession(headers=BASE_HEADERS)
        return cls(
            api=api,
            session=session,
        )

    async def connect(self):
        if self.socket:
            await self.socket.close()
        socket = await self.session.ws_connect("wss://pubsub-edge.twitch.tv/v1")
        self.socket = socket
        await self.listen(*self.subscriptions.keys())

    async def send(self, command: C2SPacket):
        assert self.socket is not None
        await self.socket.send_json(command)

    async def ping(self):
        if self.socket is None:
            raise ValueError("Socket not connected")
        while self.socket and not self.socket.closed:
            await asyncio.sleep(60)
            await self.send(C2SPing(type="PING"))

    async def handle(self):
        if self.handle_future is not None:
            raise ValueError("Already handling")
        loop = asyncio.get_event_loop()
        self.handle_future = loop.create_future()
        if self.ping_task is None:
            self.ping_task = asyncio.create_task(self.ping())
        assert self.socket is not None
        try:
            while self.socket and not self.socket.closed:
                message = await self.socket.receive()
                if message.type == WSMsgType.CLOSING:
                    break
                elif message.type == WSMsgType.CLOSED:
                    logger.error("Connection closed")
                    break
                elif message.type != WSMsgType.TEXT:
                    logger.error("Received non-text message: {}", message)
                    continue
                assert isinstance(message.data, str)
                data = json.loads(message.data)
                if "type" not in data:
                    logger.error("No type in message: {}", data)
                    continue
                handler = self.handlers.get(data["type"])
                if handler is None:
                    logger.error("No handler for message type: {}", data["type"])
                    continue
                await handler(data)
            await self.connect()
        except asyncio.CancelledError:
            await self.close()
        finally:
            self.handle_future.set_result(None)

    async def close(self):
        if self.ping_task is not None:
            self.ping_task.cancel()
        if self.socket is not None:
            await self.socket.close()
        if self.handle_future is not None:
            await self.handle_future

    async def handle_pong(self, packet: S2CPong): ...

    async def handle_response(self, packet: S2CResponse): ...

    async def handle_message(self, packet: S2CMessage):
        logger.info(f"Received MESSAGE: {packet}")
        topic_id = packet["data"]["topic"]
        if topic_id not in self.subscriptions:
            logger.error("No subscription for topic: {}", topic_id)
            return
        subscription = self.subscriptions.get(topic_id)
        if subscription is None:
            logger.error("No subscription for topic: {}", topic_id)
            return
        await subscription.handle(packet)

    async def listen(self, *topic_keys: str):
        await self.send(
            C2SListen(
                type="LISTEN",
                data={"topics": list(topic_keys)},
            )
        )

    async def unlisten(self, *topic_keys: str):
        await self.send(
            C2SUnlisten(
                type="UNLISTEN",
                data={"topics": list(topic_keys)},
            )
        )

    async def subscribe_topic(self, topic: TopicHandle):
        if topic.topic_key in self.subscriptions:
            raise ValueError(f"Topic {topic.topic_key} already subscribed")
        self.subscriptions[topic.topic_key] = topic
        if self.socket is not None and not self.socket.closed:
            await self.listen(topic.topic_key)

    async def unsubscribe_topic(self, topic: TopicHandle):
        if topic.topic_key not in self.subscriptions:
            raise ValueError(f"Topic {topic.topic_key} not subscribed")
        del self.subscriptions[topic.topic_key]
        if self.socket is not None and not self.socket.closed:
            await self.unlisten(topic.topic_key)

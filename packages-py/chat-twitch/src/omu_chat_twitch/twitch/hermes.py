from __future__ import annotations

import json
import random
import string
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, LiteralString, TypedDict

from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType
from loguru import logger

from ..const import BASE_HEADERS
from .api import TwitchAPI

type Coro[**P, R] = Callable[P, Awaitable[R]]


def generate_id() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=21))


@dataclass(frozen=True, slots=True)
class ClientContext:
    chat: TwitchHermes


class Packet[T: LiteralString](TypedDict):
    type: T
    id: str
    timestamp: str


class Welcome(TypedDict):
    keepaliveSec: int
    recoveryUrl: str
    sessionId: str


class S2CWelcome(Packet[Literal["welcome"]], TypedDict):
    welcome: Welcome


class S2CKeepalive(Packet[Literal["keepalive"]], TypedDict):
    # {
    #     "id": "212864f1-788c-4aa0-8fde-daa4e870ab5a",
    #     "type": "keepalive",
    #     "timestamp": "2025-03-08T01:39:57.566314532Z",
    # }
    ...


class PubSub[T: LiteralString](TypedDict):
    topic: T


class Subscribe[T: LiteralString](TypedDict):
    id: str
    type: Literal["pubsub"]
    pubsub: PubSub[T]


class C2SSubscribe(Packet[Literal["subscribe"]], TypedDict):
    # {
    #     "type": "subscribe",
    #     "id": "ZT1RZ3MXRNtgUz2ix8U4d",
    #     "subscribe": {"id": "9D-1vLfbMrorKtEG-X5op", "type": "pubsub", "pubsub": {"topic": "ads.824516405"}},
    #     "timestamp": "2025-03-08T01:39:32.024Z",
    # }
    subscribe: Subscribe


class Subscription(TypedDict):
    id: str


class C2SUnsubscribe(Packet[Literal["unsubscribe"]], TypedDict):
    # {
    #     "type": "unsubscribe",
    #     "id": "Grr6VuLM7S5QFZOYbAq52",
    #     "unsubscribe": {"id": "4Nx5ChY1JBNLN_5Wke7fp"},
    #     "timestamp": "2025-03-08T01:39:32.024Z",
    # }
    unsubscribe: Subscription


class SubscribeResponseError(TypedDict):
    subscription: Subscription
    result: Literal["error"]
    error: str
    errorCode: str


class SubscribeResponseOk(TypedDict):
    subscription: Subscription
    result: Literal["ok"]


type UnsubscribeResponse = SubscribeResponseError | SubscribeResponseOk


class S2CSubscribeResponse(Packet[Literal["subscribeResponse"]], TypedDict):
    # {
    #     "subscribeResponse": {"subscription": {"id": "9D-1vLfbMrorKtEG-X5op"}, "result": "ok"},
    #     "id": "549eac0f-cd3f-42b5-a020-1f1c21e89c40",
    #     "parentId": "ZT1RZ3MXRNtgUz2ix8U4d",
    #     "type": "subscribeResponse",
    #     "timestamp": "2025-03-08T01:39:35.596629981Z",
    # }
    subscribeResponse: UnsubscribeResponse


class S2CUnsubscribeResponse(Packet[Literal["unsubscribeResponse"]], TypedDict):
    # {
    #     "unsubscribeResponse": {
    #         "subscription": {"id": "4Nx5ChY1JBNLN_5Wke7fp"},
    #         "result": "error",
    #         "error": "subscription does not exist",
    #         "errorCode": "UNSUB001",
    #     },
    #     "id": "f9514a11-4a60-4d80-9289-21c79baa77de",
    #     "parentId": "Grr6VuLM7S5QFZOYbAq52",
    #     "type": "unsubscribeResponse",
    #     "timestamp": "2025-03-08T01:39:35.593235189Z",
    # }
    unsubscribeResponse: UnsubscribeResponse


class Notification(TypedDict):
    # {
    #     "notification": {
    #         "subscription": {"id": "cEMTxgkSu3w4ALncPI3gv"},
    #         "type": "pubsub",
    #         "pubsub": '{"channel_id":"824516405","type":"broadcast_settings_update","channel":"a230am","old_status":"a","status":"aa","old_game":"Art","game":"Art","old_game_id":509660,"game_id":509660}',
    #     },
    #     "id": "8da8f80d-d34c-551c-8094-9848707e2a92cEMTxgkSu3w4ALncPI3gv",
    #     "type": "notification",
    #     "timestamp": "2025-03-08T01:44:18.459265594Z",
    # }
    subscription: Subscription
    type: Literal["pubsub"]
    pubsub: str


class S2CNotification(Packet[Literal["notification"]], TypedDict):
    notification: Notification


type S2CPacket = S2CWelcome | S2CKeepalive | S2CSubscribeResponse | S2CUnsubscribeResponse | S2CNotification
type C2SPacket = C2SSubscribe | C2SUnsubscribe


class TwitchHermes:
    def __init__(
        self,
        api: TwitchAPI,
        channel_id: int,
        session: ClientSession,
    ):
        self.api = api
        self.channel_id = channel_id
        self.session = session

        self.handlers: dict[str, Coro[[ClientContext, Any], None]] = {
            "welcome": self.handle_welcome,
            "keepalive": self.handle_keepalive,
            "subscribeResponse": self.handle_subscribe_response,
            "unsubscribeResponse": self.handle_unsubscribe_response,
            "notification": self.handle_notification,
        }
        self.subscriptions: dict[str, str] = {}
        self.socket: ClientWebSocketResponse | None = None

    @classmethod
    async def create(
        cls,
        api: TwitchAPI,
        login: str,
        session: ClientSession | None = None,
    ) -> TwitchHermes:
        if session is None:
            session = ClientSession(headers=BASE_HEADERS)
        res = await api.fetch_playback_access_token(login)
        channel_id = res["channel_id"]
        return cls(
            api=api,
            channel_id=channel_id,
            session=session,
        )

    async def connect(self, client_id: str):
        if self.socket is not None:
            raise ValueError("Already connected")
        socket = await self.session.ws_connect(f"wss://hermes.twitch.tv/v1?clientId={client_id}")
        self.socket = socket

    async def send(self, command: C2SPacket):
        assert self.socket is not None
        await self.socket.send_json(command)

    async def handle(self):
        assert self.socket is not None
        context = ClientContext(chat=self)
        while True:
            message = await self.socket.receive()
            if message.type == WSMsgType.CLOSED:
                logger.error("Connection closed")
                break
            if message.type != WSMsgType.TEXT:
                logger.error("Received non-text message: {}", message)
                continue
            assert isinstance(message.data, str)
            data = json.loads(message.data)
            if data["type"] not in self.handlers:
                logger.error("No handler for message type: {}", data["type"])
                continue
            handler = self.handlers.get(data["type"])
            if handler is None:
                logger.error("No handler for message type: {}", data["type"])
                continue
            await handler(context, data)

    async def handle_welcome(self, context: ClientContext, packet: S2CWelcome):
        logger.info(f"Welcome: {packet}")

    async def handle_keepalive(self, context: ClientContext, packet: S2CKeepalive):
        logger.info(f"Keepalive: {packet}")

    async def handle_subscribe_response(self, context: ClientContext, packet: S2CSubscribeResponse):
        logger.info(f"Subscribe response: {packet}")

    async def handle_unsubscribe_response(self, context: ClientContext, packet: S2CUnsubscribeResponse):
        logger.info(f"Unsubscribe response: {packet}")

    async def handle_notification(self, context: ClientContext, packet: S2CNotification):
        logger.info(f"Notification: {packet}")

    async def subscribe(self, topic: str) -> str:
        topic = f"{topic}.{self.channel_id}"
        id = generate_id()
        self.subscriptions[topic] = id
        await self.send(
            C2SSubscribe(
                type="subscribe",
                id=id,
                subscribe={"id": id, "type": "pubsub", "pubsub": {"topic": topic}},
                timestamp=datetime.now().isoformat(),
            )
        )
        return id

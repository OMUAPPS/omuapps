import asyncio
import json
from collections.abc import Callable, Coroutine
from uuid import uuid4

from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType
from loguru import logger

from .payloads import (
    AuthenticateResponseData,
    AuthorizeResponseData,
    GetChannelResponseData,
    GetChannelsResponseData,
    GetGuildsResponseData,
    RequestPayloads,
    ResponsePayloads,
    Scope,
    SpeakingStartData,
    SpeakingStopData,
    SubscribePayloads,
    VoiceStateItem,
)

CLIENT_ID = 207646673902501888


type Coro[**Args, Returns] = Callable[Args, Coroutine[None, None, Returns]]


class DiscordRPC:
    def __init__(self, session: ClientSession, ws: ClientWebSocketResponse):
        self.session = session
        self.ws = ws
        self.dispatch_handlers: dict[str, asyncio.Future[ResponsePayloads]] = {}
        self.subscribe_handlers: dict[str, Coro[[ResponsePayloads], None]] = {}

    async def receive(self) -> ResponsePayloads | None:
        msg = await self.ws.receive()
        if msg.type == WSMsgType.TEXT:
            return json.loads(msg.data)
        elif msg.type == WSMsgType.CLOSED:
            return None
        else:
            raise ValueError(f"Unexpected message type: {msg.type}")

    async def start(self) -> None:
        while True:
            msg = await self.receive()
            if msg is None:
                break
            if msg.get("nonce") is not None:
                future = self.dispatch_handlers.pop(msg["nonce"])
                future.set_result(msg)
            elif msg["cmd"] == "DISPATCH":
                await self.subscribe_handlers[msg["evt"]](msg)
            else:
                logger.warning(f"Unhandled message: {msg}")

    async def send(self, payload: RequestPayloads) -> None:
        await self.ws.send_json(payload)

    async def dispatch(self, req: RequestPayloads) -> ResponsePayloads:
        await self.ws.send_json(req)
        future = asyncio.Future[ResponsePayloads]()
        self.dispatch_handlers[req["nonce"]] = future
        return await future

    async def subscribe(
        self, payload: SubscribePayloads, handler: Coro[[ResponsePayloads], None]
    ) -> None:
        self.subscribe_handlers[payload["evt"]] = handler
        # await self.ws.send_json(payload)
        await self.dispatch(payload)

    async def authorize(self, scopes: list[Scope]) -> AuthorizeResponseData:
        res = await self.dispatch(
            {
                "cmd": "AUTHORIZE",
                "args": {
                    "client_id": "207646673902501888",
                    "scopes": scopes,
                    "prompt": "none",
                },
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "AUTHORIZE"
        assert res["evt"] is None
        return res["data"]

    async def authenticate(self, code: str) -> AuthenticateResponseData:
        headers = {}

        json_data = {
            "code": code,
        }

        token_res = await self.session.post(
            "https://streamkit.discord.com/overlay/token",
            headers=headers,
            json=json_data,
        )
        token_data = await token_res.json()
        token = token_data["access_token"]
        res = await self.dispatch(
            {
                "cmd": "AUTHENTICATE",
                "args": {"access_token": token},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "AUTHENTICATE"
        assert res["evt"] is None
        return res["data"]

    async def get_guilds(self) -> GetGuildsResponseData:
        res = await self.dispatch(
            {
                "cmd": "GET_GUILDS",
                "args": {},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "GET_GUILDS"
        assert res["evt"] is None
        return res["data"]

    async def get_channels(self, guild_id: str) -> GetChannelsResponseData:
        res = await self.dispatch(
            {
                "cmd": "GET_CHANNELS",
                "args": {"guild_id": guild_id},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "GET_CHANNELS"
        assert res["evt"] is None
        return res["data"]

    async def get_channel(self, channel_id: str) -> GetChannelResponseData:
        res = await self.dispatch(
            {
                "cmd": "GET_CHANNEL",
                "args": {"channel_id": channel_id},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "GET_CHANNEL"
        assert res["evt"] is None
        return res["data"]

    async def subscribe_voice_state_create(
        self, channel_id: str, handler: Coro[[VoiceStateItem], None]
    ) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "VOICE_STATE_CREATE"
            data = payload["data"]
            await handler(data)

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "VOICE_STATE_CREATE",
                "args": {
                    "channel_id": channel_id,
                },
                "nonce": str(uuid4()),
            },
            handle,
        )

    async def subscribe_voice_state_update(
        self, channel_id: str, handler: Coro[[VoiceStateItem], None]
    ) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "VOICE_STATE_UPDATE"
            data = payload["data"]
            await handler(data)

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "VOICE_STATE_UPDATE",
                "args": {
                    "channel_id": channel_id,
                },
                "nonce": str(uuid4()),
            },
            handle,
        )

    async def subscribe_voice_state_delete(
        self, channel_id: str, handler: Coro[[VoiceStateItem], None]
    ) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "VOICE_STATE_DELETE"
            data = payload["data"]
            await handler(data)

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "VOICE_STATE_DELETE",
                "args": {
                    "channel_id": channel_id,
                },
                "nonce": str(uuid4()),
            },
            handle,
        )

    async def subscribe_speaking_start(
        self, channel_id: str, handler: Coro[[SpeakingStartData], None]
    ) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "SPEAKING_START"
            data = payload["data"]
            await handler(data)

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "SPEAKING_START",
                "args": {
                    "channel_id": channel_id,
                },
                "nonce": str(uuid4()),
            },
            handle,
        )

    async def subscribe_speaking_stop(
        self, channel_id: str, handler: Coro[[SpeakingStopData], None]
    ) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "SPEAKING_STOP"
            data = payload["data"]
            await handler(data)

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "SPEAKING_STOP",
                "args": {
                    "channel_id": channel_id,
                },
                "nonce": str(uuid4()),
            },
            handle,
        )

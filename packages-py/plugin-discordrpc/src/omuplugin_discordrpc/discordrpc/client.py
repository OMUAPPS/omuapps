from __future__ import annotations

import asyncio
import json
from collections.abc import Callable, Coroutine
from uuid import uuid4

from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType
from loguru import logger

from .payloads import (
    AuthenticateResponseData,
    AuthorizeResponseData,
    ErrorData,
    GetChannelResponseData,
    GetChannelsResponseData,
    GetGuildResponseData,
    GetGuildsResponseData,
    RequestPayloads,
    ResponsePayloads,
    Scope,
    SpeakingStartData,
    SpeakingStopData,
    SubscribePayloads,
    VoiceChannelSelect,
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
        self.closed: bool = False

    @staticmethod
    async def connect(port: int) -> DiscordRPC:
        session = ClientSession(
            headers={
                "accept": "*/*",
                "accept-language": "ja",
                "cache-control": "no-cache",
                "content-type": "application/json",
                "origin": "https://streamkit.discord.com",
                "pragma": "no-cache",
                "referer": "https://streamkit.discord.com/overlay",
                "user-agent": "OMUAPPS Discord StreamKit/1.0.0",
            },
        )
        ws = await session.ws_connect(
            f"ws://127.0.0.1:{port}/?v=1&client_id={CLIENT_ID}",
            autoping=False,
        )
        rpc = DiscordRPC(session, ws)
        msg = await rpc.receive()
        assert msg is not None
        assert msg["cmd"] == "DISPATCH", f"Unexpected message: {msg}"
        assert msg["evt"] == "READY", f"Unexpected event: {msg}"
        asyncio.create_task(rpc.start())

        async def _handle_error(data: ErrorData):
            logger.error(f"Error with session {port}: {data}")

        await rpc.subscribe_error(_handle_error)

        return rpc

    async def close(self) -> None:
        await self.ws.close()
        await self.session.close()
        self.closed = True

    async def receive(self) -> ResponsePayloads | None:
        msg = await self.ws.receive()
        if msg.type == WSMsgType.TEXT:
            return json.loads(msg.data)
        elif msg.type == WSMsgType.CLOSE:
            logger.warning(f"Connection closed: {msg}")
            return None
        elif msg.type == WSMsgType.CLOSED:
            return None
        elif msg.type == WSMsgType.CLOSING:
            return None
        else:
            raise ValueError(f"Unexpected message type: {msg.type}")

    async def start(self) -> None:
        try:
            while not self.ws.closed:
                msg = await self.receive()
                if msg is None:
                    break
                if msg.get("nonce") is not None:
                    future = self.dispatch_handlers.pop(msg["nonce"])
                    future.set_result(msg)
                elif msg["cmd"] == "DISPATCH":
                    coro = self.subscribe_handlers.get(msg["evt"])
                    if coro is not None:
                        asyncio.create_task(coro(msg))
                else:
                    logger.warning(f"Unhandled message: {msg}")
        except Exception as e:
            logger.opt(exception=e).error("Error in DiscordRPC.start")
        finally:
            self.closed = True

    async def send(self, payload: RequestPayloads) -> None:
        await self.ws.send_json(payload)

    async def dispatch(self, req: RequestPayloads) -> ResponsePayloads:
        await self.ws.send_json(req)
        future = asyncio.Future[ResponsePayloads]()
        self.dispatch_handlers[req["nonce"]] = future
        return await future

    async def subscribe(self, payload: SubscribePayloads, handler: Coro[[ResponsePayloads], None]) -> None:
        self.subscribe_handlers[payload["evt"]] = handler
        await self.dispatch(payload)

    async def authorize(self, scopes: list[Scope], retry=3) -> AuthorizeResponseData:
        res = await self.dispatch(
            {
                "cmd": "AUTHORIZE",
                "args": {
                    "client_id": f"{CLIENT_ID}",
                    "scopes": scopes,
                    "prompt": "none",
                },
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "AUTHORIZE"
        assert res["evt"] is None
        return res["data"]

    async def fetch_access_token(
        self,
        code: str,
    ) -> str:
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
        if "error" in token_data:
            raise Exception(f"Failed to fetch access token: {token_data}")
        if "access_token" not in token_data:
            raise Exception(f"Failed to fetch access token: {token_data}")
        token = token_data["access_token"]
        return token

    async def authenticate(
        self,
        access_token: str,
    ) -> AuthenticateResponseData:
        res = await self.dispatch(
            {
                "cmd": "AUTHENTICATE",
                "args": {"access_token": access_token},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "AUTHENTICATE"
        if res["evt"] == "ERROR":
            raise Exception(f"Failed to authenticate: {res['data']}")
        assert res["evt"] is None, res
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

    async def get_guild(self, guild_id: str) -> GetGuildResponseData:
        res = await self.dispatch(
            {
                "cmd": "GET_GUILD",
                "args": {"guild_id": guild_id, "timeout": 60},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "GET_GUILD"
        assert res["evt"] is None
        return res["data"]

    async def get_selected_voice_channel(self) -> GetChannelResponseData | None:
        res = await self.dispatch(
            {
                "cmd": "GET_SELECTED_VOICE_CHANNEL",
                "args": {},
                "nonce": str(uuid4()),
            }
        )
        assert res["cmd"] == "GET_SELECTED_VOICE_CHANNEL"
        assert res["evt"] is None
        return res["data"]

    async def subscribe_error(self, handler: Coro[[ErrorData], None]) -> None:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "ERROR"
            await handler(payload["data"])

        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "ERROR",
                "args": None,
                "nonce": str(uuid4()),
            },
            handle,
        )

    async def subscribe_voice_state_create(self, channel_id: str, handler: Coro[[VoiceStateItem], None]) -> None:
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

    async def subscribe_voice_state_update(self, channel_id: str, handler: Coro[[VoiceStateItem], None]) -> None:
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

    async def subscribe_voice_state_delete(self, channel_id: str, handler: Coro[[VoiceStateItem], None]) -> None:
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

    async def subscribe_speaking_start(self, channel_id: str, handler: Coro[[SpeakingStartData], None]) -> None:
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

    async def subscribe_speaking_stop(self, channel_id: str, handler: Coro[[SpeakingStopData], None]) -> None:
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

    async def subscribe_voice_channel_select(
        self,
        channel_id: str | None,
        guild_id: str | None,
        handler: Coro[[VoiceChannelSelect], None],
    ) -> Coro[[], ResponsePayloads]:
        async def handle(payload: ResponsePayloads):
            if payload["cmd"] == "SUBSCRIBE":
                return
            assert payload["cmd"] == "DISPATCH"
            assert payload["evt"] == "VOICE_CHANNEL_SELECT"
            data = payload["data"]
            await handler(data)

        nonce = str(uuid4())
        await self.subscribe(
            {
                "cmd": "SUBSCRIBE",
                "evt": "VOICE_CHANNEL_SELECT",
                "args": {
                    "channel_id": channel_id,
                    "guild_id": guild_id,
                },
                "nonce": nonce,
            },
            handle,
        )
        return lambda: self.dispatch(
            {
                "cmd": "UNSUBSCRIBE",
                "evt": "VOICE_CHANNEL_SELECT",
                "nonce": nonce,
            }
        )

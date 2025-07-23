from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Mapping
from typing import Final

from aiohttp import ClientSession, ClientWebSocketResponse, WSMsgType
from loguru import logger

from .command import Command, Commands, TwitchCommand

type Coro[**P, R] = Callable[P, Awaitable[R]]


class TwitchChat:
    def __init__(self, session: ClientSession):
        self.session: Final = session
        self.handlers: Final[dict[str, Coro[[TwitchChat, TwitchCommand], None]]] = {}
        self.socket: ClientWebSocketResponse | None = None
        self.handle_future: asyncio.Future[None] | None = None

    def add_handler(self, action: str, handler: Coro[[TwitchChat, TwitchCommand], None]):
        self.handlers[action] = handler

    def update_handlers(self, handlers: Mapping[str, Coro[[TwitchChat, TwitchCommand], None]]):
        self.handlers.update(handlers)

    @classmethod
    async def create(cls, session: ClientSession | None = None) -> TwitchChat:
        if session is None:
            session = ClientSession()
        return cls(session)

    async def connect(self):
        if self.socket is not None:
            raise ValueError("Already connected")
        socket = await self.session.ws_connect("wss://irc-ws.chat.twitch.tv/")
        self.socket = socket
        session_nick = "justinfan2576"
        await self.send(Commands.CAP("twitch.tv/tags", "twitch.tv/commands"))
        await self.send(Commands.NICK(session_nick))
        await self.send(Commands.USER(session_nick))

    async def join(self, channel_login: str):
        await self.send(Commands.JOIN(channel_login))

    async def part(self, channel_login: str):
        await self.send(Commands.PART(channel_login))

    async def send(self, command: Command):
        assert self.socket is not None
        parts: list[str] = []
        if command.params:
            parts.append(f"@{';'.join(f'{k}={v}' for k, v in command.params.items())}")
        if command.arguments:
            parts.extend(" ".join(arg) for arg in command.arguments)
        await self.socket.send_str(" :".join(parts))

    async def handle(self):
        if self.handle_future is not None:
            raise ValueError("Already handling")
        loop = asyncio.get_event_loop()
        self.handle_future = loop.create_future()
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
                commands = list(map(Command.try_parse, filter(len, message.data.split("\r\n"))))
                for command in commands:
                    await self.process_command(command)
        except asyncio.CancelledError:
            await self.close()
        finally:
            self.handle_future.set_result(None)

    async def close(self):
        if self.socket is not None:
            await self.socket.close()
        if self.handle_future is not None:
            await self.handle_future

    async def process_command(self, command: Command):
        args = command.arguments
        if len(args) == 0:
            return
        params: dict[str, str] = command.params
        first, *rest_args = args
        if len(first) == 1:
            action = first[0]
            packet = TwitchCommand(
                params=params,
                sender="",
                action=action,
                args=rest_args,
            )
        else:
            sender, action, *_ = first
            packet = TwitchCommand(
                params=params,
                sender=sender,
                action=action,
                args=rest_args,
            )
        if action in self.handlers:
            await self.handlers[action](self, packet)
        elif action.isnumeric():
            pass
        else:
            logger.warning(f"Unknown action {action}: {command.to_json()}")

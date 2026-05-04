from __future__ import annotations

import asyncio
import re
import uuid
from csv import Error
from dataclasses import dataclass, field
from datetime import datetime
from typing import (
    Literal,
    NotRequired,  # Python 3.11未満の場合はpip install typing_extensions
    TypedDict,
)

import bs4
from aiohttp import ClientConnectionResetError, ClientSession, ClientWebSocketResponse, WSMsgType
from aiohttp.client_reqrep import ClientResponse
from loguru import logger
from omu import Identifier, Omu
from omu_chat import Chat
from omu_chat.model import Provider
from omu_chat.model.author import Author
from omu_chat.model.channel import Channel
from omu_chat.model.content import Component, Image, Root, Text
from omu_chat.model.message import Message
from omu_chat.model.role import Role
from omu_chat.model.room import Room
from omu_chatprovider.helper import get_session
from omu_chatprovider.service import ProviderContext, ProviderService

from .const import (
    PROVIDER,
)


# エモート情報の型定義
class EmoticonData(TypedDict):
    a: str  # 短縮名 (alias)
    # https://images.picarto.tv/...
    u: str  # 画像パス (url) "ptvimages/1/13/1300/emoticons/A_pizza_b.gif"


# バッジ等の詳細情報の型定義 (cbフィールド用)
class BadgeInfo(TypedDict):
    c: int
    # https://images.picarto.tv/...
    i: str  # "badges/1000.png"


# 個別のメッセージデータの型定義
class MessageData(TypedDict):
    t: Literal["c"]  # メッセージ種別 (例: "c")
    m: str  # メッセージ本文
    c: NotRequired[str]  # チャンネルID
    u: NotRequired[str]  # ユーザーID
    n: NotRequired[str]  # ユーザー名
    rn: NotRequired[str]  # ルーム名
    i: NotRequired[str]  # アバターパス
    y: NotRequired[str]  # ユーザーランク (例: "P", "F")
    id: NotRequired[str]  # メッセージ固有ID
    d: NotRequired[int]  # タイムスタンプ
    k: NotRequired[str]  # カラーコード
    rc: NotRequired[str]  # ルームカラーコード (?)
    cb: NotRequired[bool | BadgeInfo]  # バッジ情報またはフラグ
    g: NotRequired[list[str]]  # グループ/権限IDリスト
    s: NotRequired[bool]  # 特殊フラグ1 (staff/subscribed?)
    o: NotRequired[bool]  # 特殊フラグ2
    e: NotRequired[list[EmoticonData]]  # 使用されているエモートのリスト


# ルートオブジェクトの型定義
class S2CCommandChat(TypedDict):
    p: bool
    t: Literal["c"]
    m: list[MessageData]  # メッセージリスト


class S2CCommandSystem(TypedDict):
    # {"t": "system", "m": [{"t": "system", "m": "Welcome to RaptorARTStudios's Chat"}]}
    t: Literal["system"]
    m: list[MessageData]


class C2SCommandPing(TypedDict):
    type: Literal["ping"]
    message: Literal["__ping__"]


class S2CCommandPing(TypedDict):
    success: bool
    code: Literal["PONG"]


class Stream(TypedDict):
    id: int
    user_id: int
    name: str
    account_type: Literal["PREMIUM"]
    avatar: str  # Full URL
    offline_image: str  # Full URL
    thumbnail_image: str  # Full URL
    online: bool
    stream_name: str  # "golive+name"
    color: str  # "#abcdef"
    adult: bool
    multistream: bool
    webrtc: bool
    host: bool
    viewers: int
    subscription_enabled: bool
    accountType: Literal["PREMIUM"]
    channelId: int
    channelName: str
    nicknameColor: None  # Maybe hex color code
    offlineImage: str  # Full URL
    streamName: str  # "golive+name"
    thumbnailImage: str  # Full URL
    hosted: bool


class StreamMessages(TypedDict):
    id: int
    name: str
    online: bool
    multistream: bool
    adult: bool
    viewers: int
    streams: list[Stream]


class S2CCommandStream(TypedDict):
    type: Literal["stream"]
    messages: StreamMessages


class S2CCommandCTT(TypedDict):
    type: Literal["ctt"]


class S2CCommandST(TypedDict):
    type: Literal["st"]


class CommandUnknown(TypedDict):
    type: NotRequired[Literal[""]]
    t: NotRequired[Literal[""]]


type S2CCommand = (
    S2CCommandChat
    | S2CCommandSystem
    | S2CCommandPing
    | S2CCommandStream
    | S2CCommandCTT
    | S2CCommandST
    | CommandUnknown
)
type C2SCommand = C2SCommandPing | CommandUnknown


@dataclass
class PicartoAPI:
    emoticon_lookup: dict[str, EmoticonData] = field(default_factory=dict)

    @classmethod
    async def create(cls, session: ClientSession):
        main_script = await PicartoAPI.extract_main_script(session)

        data_modules = cls.parse_data_modules(main_script)
        dictionaries = cls.parse_dictionaries(main_script)
        emoticon_lookup = cls.parse_emoticons_dictionaries(data_modules, dictionaries)

        return PicartoAPI(emoticon_lookup=emoticon_lookup)

    @classmethod
    def parse_emoticons_dictionaries(cls, data_modules, dictionaries):
        emoticon_lookup: dict[str, EmoticonData] = {}

        pattern = re.compile(
            r"{(?:(?:name:\"(?P<name>[^\"]+)\"|filename:\"(?P<filename>[^\"]+)\"|emoticon:\w+\((?P<module>\d+)\)),?)*",
            flags=re.MULTILINE,
        )
        for dictionary in dictionaries:
            matches = pattern.finditer(dictionary)

            for match in matches:
                groups = match.groupdict()
                name = groups["name"]
                alias = f"ptv-{name}"
                module = groups["module"]
                if module not in data_modules:
                    continue
                emoticon_data = EmoticonData(
                    {
                        "a": alias,
                        "u": data_modules[module],
                    }
                )
                emoticon_lookup[alias] = emoticon_data
        return emoticon_lookup

    @classmethod
    def parse_dictionaries(cls, main_script):
        matches = re.compile(
            r"\[({(?:\s*\w+:\s*(?:\"[^\"]*\"|\w\([^\)]+\)),?)*\s*},?\s*)+\]", flags=re.MULTILINE
        ).finditer(main_script)
        dictionaries: list[str] = []
        for match in matches:
            dictionary = match.group()
            dictionaries.append(dictionary)
        return dictionaries

    @classmethod
    def parse_data_modules(cls, main_script):
        matches = re.compile(
            r"(?P<id>\d+):\s?function\(.\)\s?{\s*(?:\"use strict\";)?\s*?\w\.exports\s?=\s?\"(?P<data>data:[^\"]+)\"",
            flags=re.MULTILINE,
        ).finditer(main_script)
        data_modules: dict[str, str] = {}
        for match in matches:
            groups = match.groupdict()
            module_id = groups["id"]
            module_data = groups["data"]
            data_modules[module_id] = module_data
        return data_modules

    @classmethod
    async def extract_main_script(cls, session: ClientSession) -> str:
        response = await session.get("https://picarto.tv/")
        response_text = await response.text()
        soup = bs4.BeautifulSoup(response_text, "html.parser")
        pattern = re.compile(r"main.\w+.js", flags=re.MULTILINE)
        for script in soup.select("script"):
            src = script.attrs.get("src")
            if not isinstance(src, str):
                continue
            match = pattern.search(src)
            if match is None:
                continue
            main_url = f"https://picarto.tv{src}"
            break
        else:
            raise Error("Cannot get main.js from picarto.tv")
        response = await session.get(main_url)
        return await response.text()


@dataclass
class ChatInstance:
    api: PicartoAPI
    chat: Chat
    room: Room
    channel: Channel
    socket: ClientWebSocketResponse
    handle_task: asyncio.Future | None = None
    closed: bool = False

    @staticmethod
    async def get_jwk_token(session: ClientSession, name: str) -> str:
        headers = {
            "accept": "application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed",
            "content-type": "application/json",
        }

        json_data = {
            "operationName": "generateJwtToken",
            "query": "query generateJwtToken($name: String!, $userId: Int!) {\n  generateJwtToken(channel_name: $name, user_id: $userId) {\n    key\n    __typename\n  }\n}",
            "variables": {"name": name, "userId": 0},
        }

        response: ClientResponse = await session.post(
            "https://ptvintern.picarto.tv/ptvapi", headers=headers, json=json_data
        )
        data: GenerateJwtTokenResponse = await response.json()
        key = data["data"]["generateJwtToken"]["key"]
        return key

    @classmethod
    async def connect(cls, api: PicartoAPI, session: ClientSession, chat: Chat, channel: Channel) -> ChatInstance:
        name = channel.id.path[-1]
        key = await ChatInstance.get_jwk_token(session, name)

        socket = await session.ws_connect(f"wss://chat.picarto.tv/chat/token={key}")
        initial_messages = [
            {"type": "welcomeMessage"},
            {"type": "accessLevelMessage"},
            {"type": "chatNext", "page": 1, "paginated": False},
            {"type": "settings"},
            {"type": "topChips"},
            {"type": "topChips"},
        ]
        for msg in initial_messages:
            await socket.send_json(msg)

        room = Room(
            id=channel.id,
            provider_id=PROVIDER.id,
            connected=True,
            status="offline",
            metadata={},
            channel_id=channel.id,
            created_at=datetime.now(),
        )
        self = cls(
            api=api,
            chat=chat,
            room=room,
            channel=channel,
            socket=socket,
        )
        self.handle_task = asyncio.gather(self.handle(), self.ping())
        return self

    async def handle(self):
        while not self.socket.closed:
            try:
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
                command = message.json()
                await self.process_command(command)
            except ClientConnectionResetError:
                self.closed = True
                break

    async def ping(self):
        while not self.socket.closed:
            await asyncio.sleep(30)
            await self.socket.send_json({"type": "ping", "message": "__ping__"})

    async def process_command(self, command: S2CCommand):
        if "type" in command:
            if command["type"] == "ctt":
                return
            if command["type"] == "st":
                return
            if command["type"] == "stream":
                detail = command["messages"]
                self.room.status = "online" if detail["online"] else "offline"
                for stream in detail["streams"]:
                    self.room.metadata["thumbnail"] = stream["thumbnail_image"]
                    self.room.metadata["viewers"] = stream["viewers"]
                    self.room.metadata["url"] = f"https://picarto.tv/{detail['name']}"
                await self.chat.rooms.update(self.room)
                return
            logger.warning(f"Unknown message type {command['type']}: {command}")
            return
        elif "t" in command:
            if command["t"] == "c":
                messages: list[Message] = []
                authors: set[Author] = set()
                for message in command["m"]:
                    message, author = self._parse_message(message)
                    messages.append(message)
                    if author:
                        authors.add(author)
                if len(authors) > 0:
                    new_authors = [author for author in authors if author.id.key() not in self.chat.authors.cache]
                    await self.chat.authors.add(*new_authors)
                if len(messages) > 0:
                    await self.chat.messages.add(*messages)
                    await self.update_message_ids(messages)
                return
            logger.warning(f"Unknown message type {command['t']}: {command}")
            return
        logger.warning(f"Unknown message scheme: {command}")

    async def update_message_ids(self, messages):
        if not self.room.metadata.get("first_message_id"):
            self.room.metadata["first_message_id"] = messages[0].id.key()
        self.room.metadata["last_message_id"] = messages[-1].id.key()
        await self.chat.rooms.update(self.room)

    def _parse_message(self, data: MessageData) -> tuple[Message, Author | None]:
        message_id = self.room.id / str(data.get("id", uuid.uuid4()))
        author = self._parse_author(data)
        content = self._parse_content(data)
        message = Message(
            room_id=self.room.id,
            id=message_id,
            author_id=author.id if author else None,
            content=content,
            created_at=datetime.fromtimestamp(data["d"] / 1000) if "d" in data else None,
        )
        return (message, author)

    def _parse_author(self, message: MessageData) -> Author | None:
        if "u" in message:
            author_id = self.channel.id / str(message["u"])
            avatar_url = f"https://images.picarto.tv/{message['i']}" if "i" in message else None
            roles = []
            cb = message.get("cb")
            if isinstance(cb, dict):
                roles.append(
                    Role(
                        id=str(cb["c"]),
                        name=str(cb["c"]),
                        is_moderator=False,
                        is_owner=False,
                        icon_url=f"https://images.picarto.tv/{cb['i']}",
                    )
                )
            return Author(
                provider_id=PROVIDER.id,
                id=author_id,
                avatar_url=avatar_url,
                name=message.get("n"),
                metadata={
                    "avatar_url": avatar_url,
                    "screen_id": message.get("n"),
                    "url": f"https://picarto.tv/{message['n']}" if "n" in message else None,
                },
                roles=roles,
            )

    def build_emoticon_lookup(self, message: MessageData):
        emoticon_lookup: dict[str, EmoticonData] = {}
        for emoticon in message.get("e", []):
            emoticon_lookup[emoticon["a"]] = emoticon
        return emoticon_lookup

    def _parse_content(self, message: MessageData) -> Root:
        self.api.emoticon_lookup.update(self.build_emoticon_lookup(message))
        children: list[Component] = []
        current_index = 0
        raw_text = message["m"]
        while current_index < len(raw_text):
            start_index = raw_text.find(":", current_index)
            if start_index == -1:
                rest = raw_text[current_index:-1]
                children.append(Text.of(rest))
                break
            end_index = raw_text.find(":", start_index + 1)
            if end_index == -1:
                rest = raw_text[current_index:-1]
                children.append(Text.of(rest))
                break
            alias = raw_text[start_index + 1 : end_index]
            found_emoji = self.api.emoticon_lookup.get(alias)
            if found_emoji:
                is_base64 = found_emoji["u"].startswith("data:")
                image = Image(
                    id=alias,
                    name=alias,
                    url=found_emoji["u"] if is_base64 else f"https://images.picarto.tv/{found_emoji['u']}",
                )
                children.append(image)
            else:
                children.append(Text.of(f":{alias}:"))
            current_index = end_index + 1
        return Root(children)

    async def reconnect(self): ...

    async def disconnect(self):
        self.closed = True
        await self.socket.close()


@dataclass(frozen=True, slots=True)
class PicartoChatService(ProviderService):
    api: PicartoAPI
    omu: Omu
    chat: Chat
    session: ClientSession
    instances: dict[Identifier, ChatInstance]

    @classmethod
    async def create(cls, omu: Omu, chat: Chat) -> ProviderService:
        session = get_session(omu, PROVIDER)
        api = await PicartoAPI.create(session)
        service = cls(
            api=api,
            omu=omu,
            chat=chat,
            session=session,
            instances={},
        )
        return service

    @property
    def provider(self) -> Provider:
        return PROVIDER

    async def start_channel(self, ctx: ProviderContext, channel: Channel):
        if channel.id in self.instances:
            instance = self.instances[channel.id]
            await instance.reconnect()
            return
        instance = await ChatInstance.connect(self.api, self.session, self.chat, channel)
        self.instances[channel.id] = instance

    async def stop_channel(self, ctx: ProviderContext, channel: Channel):
        if channel.id not in self.instances:
            return
        existing = self.instances[channel.id]
        await existing.disconnect()
        del self.instances[channel.id]

    async def is_online(self, room: Room) -> bool:
        if room.channel_id is None:
            return False
        instance = self.instances.get(room.channel_id)
        if instance is None:
            return False
        if instance.closed:
            del self.instances[room.channel_id]
            return False
        return True


class GraphqlResponse[T](TypedDict):
    data: T


class JwtTokenData(TypedDict):
    key: str
    __typename: Literal["JwtResponse"]


class GenerateJwtTokenResponseData(TypedDict):
    generateJwtToken: JwtTokenData


type GenerateJwtTokenResponse = GraphqlResponse[GenerateJwtTokenResponseData]

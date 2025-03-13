from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from loguru import logger
from omu import Omu
from omu.identifier import Identifier
from omu_chat import Chat
from omu_chat.model import Provider
from omu_chat.model.author import Author
from omu_chat.model.channel import Channel
from omu_chat.model.content import Component, Image, Root, Text
from omu_chat.model.message import Message
from omu_chat.model.role import Role
from omu_chat.model.room import Room, RoomMetadata
from omu_chatprovider.helper import get_session
from omu_chatprovider.service import ProviderContext, ProviderService

from .const import (
    PROVIDER,
)
from .twitch import TwitchAPI, TwitchChat, TwitchPubSub
from .twitch.chat import TwitchCommand
from .twitch.command import ChatParams, Commands, RoomStateParams
from .twitch.pubsub import BroadcastSettingsUpdate, ChannelTopicHandle, PubSubTopics, VideoPlaybackById


@dataclass()
class ChannelTopics:
    twitch: TwitchChatService
    channel: Channel
    channel_login: str
    channel_id: int
    update: ChannelTopicHandle[
        Literal["broadcast-settings-update"],
        BroadcastSettingsUpdate,
    ]
    playback: ChannelTopicHandle[
        Literal["video-playback-by-id"],
        VideoPlaybackById,
    ]
    room: Room
    stream: BroadcastSettingsUpdate = field(
        default_factory=lambda: BroadcastSettingsUpdate(
            {
                "type": "broadcast_settings_update",
                "channel_id": "",
                "channel": "",
                "old_status": "",
                "status": "",
                "old_game": "",
                "game": "",
                "old_game_id": 0,
                "game_id": 0,
            }
        )
    )

    @staticmethod
    def create_default_room(channel_login: str) -> Room:
        return Room(
            status="offline",
            provider_id=PROVIDER.id,
            id=PROVIDER.id.join(channel_login),
            connected=False,
            metadata=RoomMetadata(
                url=f"https://www.twitch.tv/{channel_login}",
                thumbnail=f"https://static-cdn.jtvnw.net/previews-ttv/live_user_{channel_login}-440x248.jpg",
                title=f"{channel_login} is offline",
                description="",
            ),
        )

    @classmethod
    async def create(cls, twitch: TwitchChatService, channel: Channel) -> ChannelTopics:
        channel_login = channel.id.path[-1]
        channel_id = await twitch.api.fetch_channel_id(channel_login)
        update = await PubSubTopics.broadcast_settings_update.create(twitch.pubsub, channel_id)
        playback = await PubSubTopics.video_playback_by_id.create(twitch.pubsub, channel_id)
        room = await cls.fetch_room(twitch, channel) or cls.create_default_room(channel_login)
        topics = ChannelTopics(
            twitch=twitch,
            channel=channel,
            channel_login=channel_login,
            channel_id=channel_id,
            update=update,
            playback=playback,
            room=room,
        )
        update.subscribe(topics.handle_update)
        playback.subscribe(topics.handle_playback)
        return topics

    async def handle_update(self, topic: ChannelTopicHandle, data: BroadcastSettingsUpdate):
        if data["type"] != "broadcast_settings_update":
            logger.warning(f"Unexpected data type: {data['type']}")
            return
        self.stream.update(data)

    @classmethod
    async def fetch_room(cls, twitch: TwitchChatService, channel: Channel) -> Room | None:
        channel_login = channel.id.path[-1]
        info = await twitch.api.fetch_stream_metadata(channel_login)
        if info is None:
            logger.warning(f"No stream metadata found for {channel_login}")
            return
        last_broadcast = info["lastBroadcast"]
        stream = info["stream"]
        if stream is None or last_broadcast is None:
            return
        room = Room(
            status="online",
            provider_id=PROVIDER.id,
            channel_id=channel.id,
            id=PROVIDER.id.join(info["channel"]["id"], last_broadcast["id"]),
            connected=True,
            metadata=RoomMetadata(
                url=f"https://www.twitch.tv/{channel_login}",
                thumbnail=f"https://static-cdn.jtvnw.net/previews-ttv/live_user_{channel_login}-440x248.jpg",
                created_at=datetime.fromisoformat(stream["createdAt"]).isoformat(),
                title=last_broadcast.get("title", ""),
                description=stream["game"]["name"],
            ),
        )
        return room

    async def handle_playback(self, topic: ChannelTopicHandle, data: VideoPlaybackById):
        if data["type"] == "stream-up":
            room = await self.fetch_room(self.twitch, self.channel)
            if room is None:
                logger.warning(f"No room found for {self.channel_login}")
                return
            self.room = room
            await self.twitch.chat.rooms.add(room)
        elif data["type"] == "stream-down":
            if self.room is not None:
                self.room.connected = False
                self.room.status = "offline"
                self.room.metadata["thumbnail"] = (
                    f"https://static-cdn.jtvnw.net/previews-ttv/live_user_{self.channel_login}-1280x720.jpg"
                )
                about_panel = await self.twitch.api.fetch_channelroot_aboutpanel(self.channel_login)
                # video_id = about_panel["user"]["videos"]["edges"][0]["node"]["id"]
                video_id = (
                    about_panel.get("user", {}).get("videos", {}).get("edges", [{}])[0].get("node", {}).get("id", None)
                )
                if video_id:
                    self.room.metadata["url"] = f"https://www.twitch.tv/videos/{video_id}"
                await self.twitch.chat.rooms.update(self.room)
                self.room = self.create_default_room(self.channel_login)
            else:
                logger.warning(f"Stream down without room: {data}")
        elif data["type"] == "viewcount":
            if self.room is not None:
                self.room.metadata["viewers"] = data["viewers"]
                await self.twitch.chat.rooms.update(self.room)
            else:
                logger.warning(f"View count without room: {data}")
        else:
            logger.warning(f"Unexpected data type: {data['type']}")

    async def unsubscribe(self):
        await self.update.unsubscribe()
        await self.playback.unsubscribe()


@dataclass(frozen=True, slots=True)
class TwitchChatService(ProviderService):
    omu: Omu
    chat: Chat
    api: TwitchAPI
    pubsub: TwitchPubSub
    twitch_chat: TwitchChat
    channel_ids: dict[str, int] = field(default_factory=dict)
    topics: dict[int, ChannelTopics] = field(default_factory=dict)

    @classmethod
    async def create(cls, omu: Omu, chat: Chat) -> ProviderService:
        session = get_session(omu, PROVIDER)
        api = await TwitchAPI.create(session=session)
        pubsub = await TwitchPubSub.create(api=api, session=session)
        twitch_chat = await TwitchChat.create(session=session)
        await pubsub.connect()
        await twitch_chat.connect()
        asyncio.gather(
            pubsub.handle(),
            twitch_chat.handle(),
        )
        service = cls(
            omu=omu,
            chat=chat,
            api=api,
            pubsub=pubsub,
            twitch_chat=twitch_chat,
        )
        handlers = {
            "PRIVMSG": service.on_privmsg,
            "CAP": service.on_cap,
            "JOIN": service.on_join,
            "PART": service.on_part,
            "ROOMSTATE": service.on_roomstate,
            "PING": service.on_ping,
            "USERNOTICE": service.on_usernotice,
        }
        twitch_chat.update_handlers(handlers)
        return service

    @property
    def provider(self) -> Provider:
        return PROVIDER

    async def fetch_channel_id(self, id: Identifier) -> int:
        login = id.path[-1]
        if login in self.channel_ids:
            return self.channel_ids[login]
        channel_id = await self.api.fetch_channel_id(login)
        self.channel_ids[login] = channel_id
        return channel_id

    async def on_privmsg(self, chat: TwitchChat, packet: TwitchCommand):
        if len(packet.args) == 0:
            return
        message_parts = packet.args[0]
        params = ChatParams(**packet.params)
        root = self.parse_message(" ".join(message_parts), params.get("emotes", ""))
        topics = self.topics.get(int(params["room-id"]))
        if topics is None:
            logger.warning(f"No topics for room: {params['room-id']}")
            return
        if topics.room is None:
            logger.warning(f"No room for topics: {params['room-id']}")
            return
        room = topics.room
        sender_login = packet.sender.split("!")[0]
        author = await self.fetch_author(params["user-id"], topics, sender_login)

        created_at = datetime.fromtimestamp(int(params["tmi-sent-ts"]) / 1000)
        message = Message(
            id=room.id.join(params["id"]),
            room_id=room.id,
            author_id=author.id,
            content=root,
            created_at=created_at,
        )
        self.update_room_metadata(room, message)
        await self.chat.rooms.update(room)
        await self.chat.messages.add(message)

    def update_room_metadata(self, room: Room, message: Message):
        if room.metadata.get("first_message_id") is None:
            room.metadata["first_message_id"] = message.id.key()
        room.metadata["last_message_id"] = message.id.key()

    async def fetch_author(self, user_id: str, topics: ChannelTopics, sender_login: str) -> Author:
        author_id = topics.channel.id.join(user_id)
        exist_author = await self.chat.authors.get(author_id.key())
        if exist_author:
            return exist_author
        viewer_card = await self.api.fetch_viewer_card(topics.channel_login, sender_login)
        roles: list[Role] = []
        channel_viewer = viewer_card["channelViewer"]
        for badge in channel_viewer.get("earnedBadges", []):
            role = Role(
                id=badge["setID"],
                name=badge["title"],
                icon_url=badge["image4x"],
                color=None,
                is_moderator=False,
                is_owner=False,
            )
            roles.append(role)

        target_user = viewer_card["targetUser"]
        author = Author(
            provider_id=PROVIDER.id,
            id=author_id,
            name=sender_login,
            avatar_url=target_user["profileImageURL"],
            roles=roles,
            metadata={
                "avatar_url": target_user["profileImageURL"],
                "screen_id": target_user["displayName"],
                "url": f"https://www.twitch.tv/{target_user['displayName']}",
            },
        )
        await self.chat.authors.add(author)
        return author

    def parse_message(self, message: str, emote_string: str = "") -> Root:
        emotes = emote_string.split("/")
        emote_indices: dict[int, tuple[str, int, int]] = {}
        for emote in emotes:
            if not emote:
                continue
            emote_id, positions = emote.split(":")
            for position in positions.split(","):
                start, end = position.split("-")
                emote_name = message[int(start) : int(end) + 1]
                emote_indices[int(start)] = (emote_id, int(start), int(end))
        emote_indices = dict(sorted(emote_indices.items()))
        parts: list[Component] = []
        prev = 0
        for _, (emote_id, start, end) in emote_indices.items():
            emote_name = message[start : end + 1]
            if prev != start:
                parts.append(Text.of(message[prev:start]))
            prev = int(end) + 1
            emote_image = Image.of(
                url=f"https://static-cdn.jtvnw.net/emoticons/v2/{emote_id}/default/dark/3.0",
                id=emote_name,
            )
            parts.append(emote_image)
        if prev != len(message):
            parts.append(Text.of(message[prev:]))
        root = Root(parts)
        return root

    async def on_cap(self, chat: TwitchChat, packet: TwitchCommand):
        capabilities = packet.args[0]
        logger.info(f"Capabilities: {capabilities}")

    async def on_join(self, chat: TwitchChat, packet: TwitchCommand):
        logger.info(f"Joined as {packet.sender}")

    async def on_part(self, chat: TwitchChat, packet: TwitchCommand):
        logger.info(f"Parted as {packet.sender}")

    async def on_roomstate(self, chat: TwitchChat, packet: TwitchCommand):
        params = RoomStateParams(**packet.params)
        logger.info(f"Joined room: {params}")

    async def on_ping(self, chat: TwitchChat, packet: TwitchCommand):
        await chat.send(Commands.PONG())

    async def on_usernotice(self, chat: TwitchChat, packet: TwitchCommand):
        # {
        #     "params": {
        #         "badge-info": "subscriber/1",
        #         "badges": "subscriber/0,premium/1",
        #         "color": "",
        #         "display-name": "dunk1e",
        #         "emotes": "",
        #         "flags": "",
        #         "id": "f0df6398-ad45-41f5-ae92-7e5ef418f0a6",
        #         "login": "dunk1e",
        #         "mod": "0",
        #         "msg-id": "sub",
        #         "msg-param-cumulative-months": "1",
        #         "msg-param-months": "0",
        #         "msg-param-multimonth-duration": "1",
        #         "msg-param-multimonth-tenure": "0",
        #         "msg-param-should-share-streak": "0",
        #         "msg-param-sub-plan-name": "Rare\\sCommentary\\s(theprimeagen)",
        #         "msg-param-sub-plan": "Prime",
        #         "msg-param-was-gifted": "false",
        #         "room-id": "167160215",
        #         "subscriber": "1",
        #         "system-msg": "dunk1e\\ssubscribed\\swith\\sPrime.",
        #         "tmi-sent-ts": "1741622572328",
        #         "user-id": "1277528173",
        #         "user-type": "",
        #         "vip": "0",
        #     },
        #     "arguments": [["tmi.twitch.tv", "USERNOTICE", "#theprimeagen"]],
        # }

        logger.info(f"User notice: {packet}")

    async def start_channel(self, ctx: ProviderContext, channel: Channel):
        channel_id = await self.fetch_channel_id(channel.id)
        if channel_id in self.topics:
            await self.stop_channel(ctx, channel)
        topics = await ChannelTopics.create(self, channel)
        await self.twitch_chat.join(topics.channel_login)
        self.topics[channel_id] = topics

    async def stop_channel(self, ctx: ProviderContext, channel: Channel):
        channel_id = await self.fetch_channel_id(channel.id)
        if channel_id not in self.topics:
            return
        topics = self.topics.pop(channel_id)
        topics.room.connected = False
        topics.room.status = "offline"
        await self.chat.rooms.update(topics.room)
        await topics.unsubscribe()
        await self.twitch_chat.part(topics.channel_login)

    async def is_online(self, room: Room) -> bool:
        if not room.channel_id:
            return False
        channel_id = await self.fetch_channel_id(room.channel_id)
        topics = self.topics.get(channel_id)
        if topics is None:
            return False
        existing_room = topics.room
        if existing_room is None:
            return False
        if existing_room.id != room.id:
            return False
        return True

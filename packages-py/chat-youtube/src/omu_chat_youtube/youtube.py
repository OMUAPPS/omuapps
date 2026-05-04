import asyncio
import urllib
import urllib.parse

from omu import Omu
from omu.identifier import Identifier
from omu_chat import Chat
from omu_chat.model import Channel, Provider, Room
from omu_chatprovider.helper import get_session
from omu_chatprovider.service import ProviderContext, ProviderService

from .chat import YoutubeChat
from .const import (
    PROVIDER,
    YOUTUBE_ID,
)
from .youtubeapi import YoutubeAPI


class YoutubeChatService(ProviderService):
    def __init__(self, omu: Omu, chat: Chat):
        self.omu = omu
        self.chat = chat
        self.session = get_session(omu, PROVIDER)
        self.extractor = YoutubeAPI(omu, self.session)
        self.chats: dict[Identifier, YoutubeChat] = {}

    @property
    def provider(self) -> Provider:
        return PROVIDER

    def _parse_video_id_by_url(self, url: str):
        uri = urllib.parse.urlparse(url)
        if uri.hostname == "youtu.be":
            return uri.path[1:]
        if uri.hostname != "www.youtube.com" and uri.hostname != "youtube.com":
            return
        path_parts = list(filter(None, uri.path.split("/")))
        if not path_parts:
            return None
        if path_parts[0] == "watch":
            query_v = urllib.parse.parse_qs(uri.query).get("v")
            if query_v:
                return query_v[0]

    async def start_url(self, ctx: ProviderContext, url: str):
        video_id = self._parse_video_id_by_url(url)
        if video_id is None:
            return
        return await self._start_by_video_id(video_id, None)

    async def _start_by_video_id(self, video_id: str, channel: Channel | None):
        room_id = YOUTUBE_ID / video_id
        existing = self.chats.get(room_id)
        if existing and not existing.closed:
            return
        room = Room(
            provider_id=YOUTUBE_ID,
            id=room_id,
            connected=False,
            status="offline",
            metadata={
                "url": f"https://www.youtube.com/watch?v={video_id}",
            },
        )

        chat = await YoutubeChat.create(
            self,
            self.chat,
            room,
            channel,
        )
        self.chats[room_id] = chat
        asyncio.create_task(chat.run())

    async def start_channel(self, ctx: ProviderContext, channel: Channel):
        videos = await self.extractor.fetch_online_videos(channel.url)
        for video_id in videos:
            await self._start_by_video_id(video_id, channel)

    async def stop_channel(self, ctx: ProviderContext, channel: Channel):
        for chat in list(self.chats.values()):
            if chat.channel is None:
                continue
            if chat.channel.id == channel.id:
                await chat.stop()
                if chat.room.id in self.chats:
                    del self.chats[chat.room.id]

    async def stop_room(self, ctx: ProviderContext, room: Room):
        if room.id in self.chats:
            chat = self.chats[room.id]
            await chat.stop()
            del self.chats[room.id]

    async def is_online(self, room: Room) -> bool:
        return await self.extractor.is_online(video_id=room.id.path[-1])

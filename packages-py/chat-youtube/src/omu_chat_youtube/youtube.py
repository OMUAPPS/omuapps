from omu import Omu
from omu_chat import Chat
from omu_chat.model import Channel, Provider, Room
from omu_chatprovider.helper import get_session
from omu_chatprovider.service import FetchedRoom, ProviderService

from .chat import YoutubeChat
from .const import (
    PROVIDER,
    YOUTUBE_IDENTIFIER,
)
from .youtubeapi import YoutubeAPI


class YoutubeChatService(ProviderService):
    def __init__(self, omu: Omu, chat: Chat):
        self.omu = omu
        self.chat = chat
        self.session = get_session(omu, PROVIDER)
        self.extractor = YoutubeAPI(omu, self.session)

    @property
    def provider(self) -> Provider:
        return PROVIDER

    async def fetch_rooms(self, channel: Channel) -> list[FetchedRoom]:
        videos = await self.extractor.fetch_online_videos(channel.url)
        rooms: list[FetchedRoom] = []
        for video_id in videos:
            room = Room(
                provider_id=YOUTUBE_IDENTIFIER,
                id=YOUTUBE_IDENTIFIER / video_id,
                connected=False,
                status="offline",
                channel_id=channel.id,
                metadata={
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                },
            )

            def create(room=room):
                return YoutubeChat.create(self, self.chat, room)

            rooms.append(
                FetchedRoom(
                    room=room,
                    create=create,
                )
            )
        return rooms

    async def is_online(self, room: Room) -> bool:
        return await self.extractor.is_online(video_id=room.id.path[-1])

from omu import Omu
from omu_chat import Chat
from omu_chat.model import Channel, Provider, Room
from omu_chatprovider.helper import get_session
from omu_chatprovider.service import FetchedRoom, ProviderService

from .api import TwitcastingAPI
from .chat import TwitcastingChat
from .const import (
    PROVIDER,
)


class TwitcastingChatService(ProviderService):
    def __init__(self, omu: Omu, chat: Chat):
        self.omu = omu
        self.chat = chat
        self.session = get_session(omu, PROVIDER)
        self.api = TwitcastingAPI(omu, self.session)

    @property
    def provider(self) -> Provider:
        return PROVIDER

    async def fetch_rooms(self, channel: Channel) -> list[FetchedRoom]:
        room = await self.api.fetch_room(channel)

        async def create(room=room) -> TwitcastingChat:
            return TwitcastingChat(
                self.session,
                self.chat,
                room,
                channel,
            )

        return [
            FetchedRoom(
                room,
                create,
            )
        ]

    async def is_online(self, room: Room) -> bool:
        return True

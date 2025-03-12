from __future__ import annotations

import abc
from dataclasses import dataclass
from importlib import metadata

from loguru import logger
from omu import Omu
from omu.helper import Coro
from omu_chat import Channel, Chat, Provider, Room
from typing_extensions import deprecated

type ChatServiceFactory = Coro[[], ChatService]


@dataclass(frozen=True, slots=True)
class FetchedRoom:
    room: Room
    create: ChatServiceFactory


class ProviderContext: ...  # For future compatibility's sake


class ProviderService(abc.ABC):
    @abc.abstractmethod
    def __init__(self, omu: Omu, chat: Chat): ...

    @classmethod
    async def create(cls, omu: Omu, chat: Chat) -> ProviderService:
        return cls(omu, chat)

    @property
    @abc.abstractmethod
    def provider(self) -> Provider: ...

    @deprecated("Legacy method, Left for future compatibility")
    async def fetch_rooms(self, channel: Channel) -> list[FetchedRoom]:
        return []

    async def add_channel(self, ctx: ProviderContext, channel: Channel):
        return

    async def remove_channel(self, ctx: ProviderContext, channel: Channel):
        return

    async def update_channel(self, ctx: ProviderContext, channel: Channel):
        return

    async def is_online(self, room: Room) -> bool:
        return True


@deprecated("Legacy type, Left for future compatibility")
class ChatService(abc.ABC):
    @property
    @abc.abstractmethod
    def room(self) -> Room: ...

    @property
    @abc.abstractmethod
    def closed(self) -> bool: ...

    @abc.abstractmethod
    async def run(self): ...

    async def start(self):
        try:
            await self.run()
        except Exception as e:
            logger.opt(exception=e).error(f"Error starting chat for {self.room.key()}")
        finally:
            await self.stop()

    async def close(self):
        return

    @deprecated("Use `close` instead")
    async def stop(self):
        await self.close()


def retrieve_services():
    entry_points = metadata.entry_points(group="omu_chatprovider.services")

    services: list[type[ProviderService]] = []
    for entry_point in entry_points:
        service = entry_point.load()
        assert issubclass(service, ProviderService), f"{service} is not a ProviderService"
        services.append(service)

    return services


__all__ = [
    "ChatService",
    "FetchedRoom",
    "ProviderService",
    "retrieve_services",
]

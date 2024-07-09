import asyncio
import time

from loguru import logger
from omu import App, Identifier, Omu
from omu_chat import Channel, Chat, Message, Room, events

from .errors import ProviderError
from .service import ChatService, ProviderService, retrieve_services
from .version import VERSION

BASE_PROVIDER_IDENTIFIER = Identifier("com.omuapps", "chatprovider")
APP = App(
    id=BASE_PROVIDER_IDENTIFIER,
    version=VERSION,
)


omu = Omu(APP)
chat = Chat(omu)

services: dict[Identifier, ProviderService] = {}
chat_services: dict[Identifier, ChatService] = {}

for service_class in retrieve_services():
    service = service_class(omu, chat)
    services[service.provider.id] = service


async def register_services():
    for service in services.values():
        await chat.providers.add(service.provider)


async def update_channel(channel: Channel, service: ProviderService):
    try:
        if not channel.active:
            for key, chat_service in tuple(chat_services.items()):
                if chat_service.room.channel_id == channel.id:
                    await chat_service.stop()
                    del chat_services[key]
            return
        fetched_rooms = await service.fetch_rooms(channel)
        for item in fetched_rooms:
            if item.room.id in chat_services:
                continue
            chat = await item.create()
            chat_services[item.room.id] = chat
            asyncio.create_task(chat.start())
            logger.info(f"Started chat for {item.room.key()}")
    except ProviderError as e:
        logger.opt(exception=e).error(f"Error updating channel {channel.key()}")


@chat.on(events.channel.add)
async def on_channel_create(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        await update_channel(channel, provider)


@chat.on(events.channel.remove)
async def on_channel_remove(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        await update_channel(channel, provider)


@chat.on(events.channel.update)
async def on_channel_update(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        await update_channel(channel, provider)


def get_provider(channel: Channel | Room) -> ProviderService | None:
    if channel.provider_id not in services:
        return None
    return services[channel.provider_id]


async def delay():
    await asyncio.sleep(15 - time.time() % 15)


async def recheck_task():
    while True:
        await recheck_channels()
        await recheck_rooms()
        await delay()


async def recheck_rooms():
    for service in tuple(chat_services.values()):
        if service.closed:
            del chat_services[service.room.id]
    rooms = await chat.rooms.fetch_items()
    for room in filter(lambda r: r.connected, rooms.values()):
        if room.provider_id not in services:
            continue
        if not await should_remove(room, services[room.provider_id]):
            continue
        await stop_room(room)


async def stop_room(room: Room):
    room.status = "offline"
    room.connected = False
    await chat.rooms.update(room)
    for key, service in tuple(chat_services.items()):
        if service.room.key() == room.key():
            await service.stop()
            del chat_services[key]


async def should_remove(room: Room, provider_service: ProviderService):
    if room.channel_id is None:
        return False
    channel = await chat.channels.get(room.channel_id.key())
    if channel and not channel.active:
        return True
    return not await provider_service.is_online(room)


async def recheck_channels():
    all_channels = await chat.channels.fetch_items()
    for channel in all_channels.values():
        provider = get_provider(channel)
        if provider is None:
            continue
        await update_channel(channel, provider)


@chat.on(events.message.add)
async def on_message_create(message: Message):
    print(f"Message created: {message.text}")
    for gift in message.gifts or []:
        print(f"Gift: {gift.name} x{gift.amount}")


@omu.event.ready.listen
async def on_ready():
    await register_services()
    await recheck_channels()
    asyncio.create_task(recheck_task())
    logger.info("Chat provider is ready")

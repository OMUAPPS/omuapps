import asyncio
import time

from loguru import logger
from omu import App, Identifier, Omu
from omu.app import AppType
from omu_chat import Channel, Chat, Message, Room, events

from .errors import ProviderError
from .service import ChatService, ProviderContext, ProviderService, retrieve_services
from .version import VERSION

BASE_PROVIDER_IDENTIFIER = Identifier("com.omuapps", "chatprovider")
APP = App(
    id=BASE_PROVIDER_IDENTIFIER,
    version=VERSION,
    type=AppType.PLUGIN,
)


omu = Omu(APP)
chat = Chat(omu)

provider_services: dict[Identifier, ProviderService] = {}
provider_channels: dict[Identifier, list[Identifier]] = {}
chat_services: dict[Identifier, ChatService] = {}
ctx = ProviderContext()


async def register_services():
    provider_services.clear()
    for service_class in retrieve_services():
        service = await service_class.create(omu, chat)
        provider_services[service.provider.id] = service
        provider_channels[service.provider.id] = []
        await chat.providers.add(service.provider)


def get_provider(channel: Channel | Room) -> ProviderService | None:
    if channel.provider_id not in provider_services:
        return None
    return provider_services[channel.provider_id]


async def update_channel(channel: Channel, service: ProviderService):
    try:
        if not channel.active:
            await stop_channel(channel, service)
            for key, chat_service in tuple(chat_services.items()):
                if chat_service.room.channel_id == channel.id:
                    await chat_service.stop()
                    del chat_services[key]
                    logger.info(f"Stopped chat for {chat_service.room.key()}")
            return
        await start_channel(channel, service)
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
    except Exception as e:
        logger.opt(exception=e).error(f"Error updating channel {channel.key()}")


async def start_channel(channel: Channel, service: ProviderService):
    if channel.id in provider_channels[channel.provider_id]:
        return
    await service.start_channel(ctx, channel)
    provider_channels[channel.provider_id].append(channel.id)


async def stop_channel(channel: Channel, service: ProviderService):
    if channel.id not in provider_channels[channel.provider_id]:
        return
    await service.stop_channel(ctx, channel)
    provider_channels[channel.provider_id].remove(channel.id)


@chat.on(events.channel.add)
async def on_channel_create(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        await provider.start_channel(ctx, channel)
        await update_channel(channel, provider)


@chat.on(events.channel.remove)
async def on_channel_remove(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        channel.active = False
        await provider.stop_channel(ctx, channel)
        await update_channel(channel, provider)


@chat.on(events.channel.update)
async def on_channel_update(channel: Channel):
    provider = get_provider(channel)
    if provider is not None:
        await update_channel(channel, provider)


async def add_channels():
    all_channels = await chat.channels.fetch_all()
    for channel in all_channels.values():
        if not channel.active:
            continue
        provider = get_provider(channel)
        if provider is None:
            continue
        await start_channel(channel, provider)


async def check_channels():
    all_channels = await chat.channels.fetch_all()
    for channel in all_channels.values():
        provider = get_provider(channel)
        if provider is None:
            continue
        await update_channel(channel, provider)


async def should_remove(room: Room, provider_service: ProviderService):
    if room.channel_id is None:
        return False
    channel = await chat.channels.get(room.channel_id.key())
    if channel and not channel.active:
        return True
    try:
        online = await provider_service.is_online(room)
        return not online
    except Exception as e:
        logger.opt(exception=e).error(f"Error checking if room {room.key()} should be removed")
        return True


async def stop_room(room: Room):
    room.status = "offline"
    room.connected = False
    await chat.rooms.update(room)
    for key, service in tuple(chat_services.items()):
        if service.room.key() == room.key():
            await service.stop()
            del chat_services[key]


async def check_rooms():
    for service in tuple(chat_services.values()):
        if service.closed:
            del chat_services[service.room.id]
    rooms = await chat.rooms.fetch_all()
    for room in filter(lambda r: r.connected, rooms.values()):
        provider = provider_services.get(room.provider_id)
        if provider is None:
            continue
        if not await should_remove(room, provider):
            continue
        await stop_room(room)


async def delay():
    await asyncio.sleep(15 - time.time() % 15)


async def recheck_task():
    while True:
        await check_channels()
        await check_rooms()
        await delay()


@chat.on(events.message.add)
async def on_message_create(message: Message):
    logger.info(f"Message created: {message.text}")
    for gift in message.gifts or []:
        logger.info(f"Gift: {gift.name} x{gift.amount}")


@omu.event.ready.listen
async def on_ready():
    await register_services()
    await add_channels()
    await check_channels()
    asyncio.create_task(recheck_task())
    logger.info("Chat provider is ready")

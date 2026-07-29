import asyncio
import time

from loguru import logger
from omu import App, Identifier, Omu
from omu.api.endpoint.endpoint import EndpointType
from omu.app import AppType
from omu_chat import Channel, Chat, Message, Room, events

from .controller import ChannelController
from .service import ProviderContext, ProviderService, retrieve_services
from .version import VERSION

BASE_PROVIDER_IDENTIFIER = Identifier("com.omuapps", "chatprovider")
APP = App(
    id=BASE_PROVIDER_IDENTIFIER,
    version=VERSION,
    type=AppType.PLUGIN,
)

START_FROM_URL = EndpointType[str, None].create_json(
    BASE_PROVIDER_IDENTIFIER,
    "start_from_url",
    permission_id=BASE_PROVIDER_IDENTIFIER,
)
STOP_ROOM = EndpointType[str, None].create_json(
    BASE_PROVIDER_IDENTIFIER,
    "stop_room",
    permission_id=BASE_PROVIDER_IDENTIFIER,
)

omu = Omu(APP)
chat = Chat(omu)

provider_services: dict[Identifier, ProviderService] = {}
ctx = ProviderContext()
controller = ChannelController(ctx, provider_services)
recheck: asyncio.Task[None] | None = None


async def register_services():
    provider_services.clear()
    for service_class in retrieve_services():
        service = await service_class.create(omu, chat)
        provider_services[service.provider.id] = service
        await chat.providers.add(service.provider)


@chat.on(events.channel.add)
async def on_channel_create(channel: Channel):
    await controller.update(channel)


@chat.on(events.channel.remove)
async def on_channel_remove(channel: Channel):
    await controller.remove(channel)


@chat.on(events.channel.update)
async def on_channel_update(channel: Channel):
    await controller.update(channel)


@chat.on(events.room.remove)
async def on_room_removed(room: Room):
    await stop_room(room)


async def add_channels():
    all_channels = await chat.channels.fetch_all()
    await controller.bootstrap(all_channels)


async def check_channels():
    await controller.refresh()


async def should_remove(room: Room, provider_service: ProviderService):
    if room.channel_id:
        if not controller.is_active(room.channel_id):
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
    if room.provider_id in provider_services:
        service = provider_services[room.provider_id]
        await service.stop_room(ctx, room)


async def check_rooms():
    rooms = await chat.rooms.fetch_items(64, backward=True)
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
    global recheck
    await register_services()
    await add_channels()
    if recheck is None or recheck.done():
        recheck = asyncio.create_task(recheck_task())
    logger.info("Chat provider is ready")


@omu.endpoints.bind(endpoint_type=START_FROM_URL)
async def api_start_by_url(url: str):
    for service in provider_services.values():
        await service.start_url(ctx, url)


@omu.endpoints.bind(endpoint_type=STOP_ROOM)
async def api_stop_room(id: str):
    room = await chat.rooms.get(id)
    if room is None:
        return
    await stop_room(room)

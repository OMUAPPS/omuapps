import asyncio

from omu import Identifier
from omu_chat import Channel
from omu_chat.model import Provider
from omu_chatprovider.controller import ChannelController
from omu_chatprovider.service import ProviderContext, ProviderService

PROVIDER_ID = Identifier("test", "provider")
CHANNEL_ID = PROVIDER_ID / "channel"


class FakeProvider(ProviderService):
    def __init__(self):
        self.started = asyncio.Event()
        self.release = asyncio.Event()
        self.calls: list[str] = []

    @property
    def provider(self) -> Provider:
        return Provider(
            id=PROVIDER_ID,
            url="https://example.com",
            name="Test",
            version="1.0.0",
            repository_url="https://example.com/repository",
            regex="",
        )

    async def start_channel(self, ctx: ProviderContext, channel: Channel):
        self.calls.append("start")
        self.started.set()
        await self.release.wait()

    async def stop_channel(self, ctx: ProviderContext, channel: Channel):
        self.calls.append("stop")


def create_channel(*, active: bool = True) -> Channel:
    return Channel(
        provider_id=PROVIDER_ID,
        id=CHANNEL_ID,
        url="https://example.com/channel",
        name="channel",
        description=None,
        active=active,
    )


def test_remove_during_start_finishes_stopped():
    async def run():
        provider = FakeProvider()
        ctx = ProviderContext()
        controller = ChannelController(ctx, {PROVIDER_ID: provider})
        channel = create_channel()

        start = asyncio.create_task(controller.update(channel))
        await provider.started.wait()

        remove = asyncio.create_task(controller.remove(channel))
        await asyncio.sleep(0)
        assert not ctx.is_channel_active(CHANNEL_ID)

        provider.release.set()
        await asyncio.gather(start, remove)

        assert provider.calls == ["start", "stop"]

    asyncio.run(run())


def test_refresh_does_not_restart_removed_channel():
    async def run():
        provider = FakeProvider()
        provider.release.set()
        ctx = ProviderContext()
        controller = ChannelController(ctx, {PROVIDER_ID: provider})
        channel = create_channel()

        await controller.update(channel)
        await controller.remove(channel)
        await controller.refresh()

        assert provider.calls == ["start", "stop"]

    asyncio.run(run())

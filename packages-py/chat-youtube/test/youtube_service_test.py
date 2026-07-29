import asyncio

from omu_chat import Channel
from omu_chat_youtube.const import PROVIDER
from omu_chat_youtube.youtube import YoutubeChatService
from omu_chatprovider.service import ProviderContext


class FakeExtractor:
    def __init__(self):
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def fetch_online_videos(self, url: str) -> list[str]:
        self.started.set()
        await self.release.wait()
        return ["video"]


class FakeYoutubeChatService(YoutubeChatService):
    def __init__(self):
        self.extractor = FakeExtractor()
        self.started_videos: list[str] = []

    async def _start_by_video_id(
        self,
        video_id: str,
        channel: Channel | None,
    ):
        self.started_videos.append(video_id)


def test_removed_channel_does_not_start_after_discovery():
    async def run():
        channel = Channel(
            provider_id=PROVIDER.id,
            id=PROVIDER.id / "channel",
            url="https://youtube.com/@channel",
            name="channel",
            description=None,
            active=True,
        )
        service = FakeYoutubeChatService()
        ctx = ProviderContext()
        active = True
        ctx.bind_channel_active(lambda _: active)

        start = asyncio.create_task(service.start_channel(ctx, channel))
        await service.extractor.started.wait()
        active = False
        service.extractor.release.set()
        await start

        assert service.started_videos == []

    asyncio.run(run())

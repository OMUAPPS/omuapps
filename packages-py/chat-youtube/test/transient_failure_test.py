import asyncio
import json
from collections import deque
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import aiohttp
import pytest
from omu_chat import Room
from omu_chat_youtube.chat import ChatData, YoutubeChat, YoutubeChatAPI
from omu_chat_youtube.const import YOUTUBE_ID
from omu_chat_youtube.youtubeapi import YoutubeAPI
from omu_chatprovider.errors import ProviderTemporarilyUnavailable

KINDS = ("invalidationContinuationData", "timedContinuationData", "reloadContinuationData")


def chat_data(kind="invalidationContinuationData"):
    return {
        "continuationContents": {
            "liveChatContinuation": {
                "continuations": [{kind: {"continuation": "secret-token"}}],
                "actions": [],
            }
        }
    }


class Response:
    def __init__(self, data=None, text="", status=200):
        self.data = data
        self.body = text
        self.status = status

    def release(self):
        pass

    async def text(self):
        return self.body

    async def json(self):
        if isinstance(self.data, Exception):
            raise self.data
        return self.data


class Session:
    def __init__(self, kind="invalidationContinuationData", posts=None, details=None):
        initial = {
            "contents": {
                "liveChatRenderer": {
                    "continuations": [{kind: {"continuation": "secret-token"}}] if kind else [],
                }
            }
        }
        self.chat_page = Response(
            text='<script>ytcfg.set({"INNERTUBE_API_KEY":"secret-key"});</script>'
            + "<script>var ytInitialData = "
            + json.dumps(initial)
            + ";</script>"
        )
        player = {"microformat": {"playerMicroformatRenderer": {"liveBroadcastDetails": details or {}}}}
        self.watch_page = Response(text="<script>var ytInitialPlayerResponse = " + json.dumps(player) + ";</script>")
        self.posts = deque(posts or [Response(data=chat_data(kind or KINDS[0]))])
        self.watch_count = 0

    async def get(self, url, **kwargs):
        if url.endswith("/watch"):
            self.watch_count += 1
            return self.watch_page
        if isinstance(self.chat_page, Exception):
            raise self.chat_page
        return self.chat_page

    async def post(self, *args, **kwargs):
        response = self.posts.popleft() if len(self.posts) > 1 else self.posts[0]
        if isinstance(response, Exception):
            raise response
        return response


def api_for(session):
    api = YoutubeAPI(None, session)
    api.throttle.interval = timedelta(0)
    return api


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
async def test_continuation_formats_work_for_connect_reset_fetch_and_online(kind):
    session = Session(kind)
    api = api_for(session)
    chat = await YoutubeChatAPI.from_video_id(api, "video")
    assert await chat.reset_continuation()
    assert await chat.is_online()
    assert await chat.next() is not None
    assert chat.chat_continuation == "secret-token"
    assert session.watch_count == 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        Response(status=503),
        Response(data={"error": {"code": 503, "message": "secret-token"}}),
        TimeoutError("secret-token"),
        aiohttp.ClientConnectionError("secret-token"),
        Response(data=ValueError("secret-token")),
        Response(data={}),
        Response(data=[]),
        Response(data={"continuationContents": None}),
    ],
)
async def test_online_failures_are_unknown_and_do_not_expose_response_secrets(response):
    api = api_for(Session(posts=[response]))
    with pytest.raises(ProviderTemporarilyUnavailable) as error:
        await api.is_online("video")
    assert "secret-token" not in str(error.value)
    assert "secret-key" not in str(error.value)


@pytest.mark.asyncio
@pytest.mark.parametrize("page", [Response(status=503), TimeoutError(), Response(text="not a page")])
async def test_chat_page_failure_does_not_mean_offline(page):
    session = Session()
    session.chat_page = page
    with pytest.raises(ProviderTemporarilyUnavailable):
        await api_for(session).is_online("video")


@pytest.mark.asyncio
@pytest.mark.parametrize("details", [{}, {"isLiveNow": False}, {"endTimestamp": "invalid"}])
async def test_missing_continuation_and_unconfirmed_end_are_unknown(details):
    with pytest.raises(ProviderTemporarilyUnavailable):
        await api_for(Session(kind=None, details=details)).is_online("video")


@pytest.mark.asyncio
async def test_confirmed_end_stops_online_check_and_fetch():
    session = Session(details={"endTimestamp": "2026-10-19T14:02:46+00:00"}, posts=[Response(data={})])
    api = api_for(session)
    chat = await YoutubeChatAPI.from_video_id(api, "video")
    assert not await api.is_online("video")
    assert await chat.next() is None


@pytest.mark.asyncio
async def test_failed_end_confirmation_is_unknown():
    session = Session(kind=None)
    session.watch_page = Response(status=503)
    with pytest.raises(ProviderTemporarilyUnavailable):
        await api_for(session).is_online("video")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"continuationContents": {"liveChatContinuation": {}}},
        {**chat_data(), "frameworkUpdates": []},
        {**chat_data(), "frameworkUpdates": {"entityBatchUpdate": {"mutations": "invalid"}}},
    ],
)
async def test_unrecognized_fetch_response_retries_instead_of_closing(monkeypatch, payload):
    session = Session(posts=[Response(data=payload), Response(data=chat_data())])
    chat = await YoutubeChatAPI.from_video_id(api_for(session), "video")
    monkeypatch.setattr("omu_chat_youtube.chat.asyncio.sleep", AsyncMock())
    assert await chat.next() is not None


@pytest.mark.asyncio
async def test_fetch_recovers_and_exhaustion_does_not_signal_end(monkeypatch):
    session = Session(posts=[Response(status=503), Response(data=chat_data())])
    chat = await YoutubeChatAPI.from_video_id(api_for(session), "video")
    sleep = AsyncMock()
    monkeypatch.setattr("omu_chat_youtube.chat.asyncio.sleep", sleep)
    assert await chat.next() is not None
    sleep.assert_awaited_once_with(10)
    session.posts = deque([Response(data={})])
    with pytest.raises(ProviderTemporarilyUnavailable):
        await chat.next()
    session.posts = deque([Response(data=chat_data())])
    assert await chat.next() is not None


def room_instance():
    room = Room(
        provider_id=YOUTUBE_ID, id=YOUTUBE_ID / "video", channel_id=None, connected=True, status="online", metadata={}
    )
    rooms = SimpleNamespace(update=AsyncMock())
    chat_api = SimpleNamespace(video_id="video", next=AsyncMock(), fetch_metadata=AsyncMock(return_value={}))
    instance = YoutubeChat(None, SimpleNamespace(rooms=rooms), None, room, chat_api)
    # Author profile fetching is independent of chat polling and uses external services.
    instance.tasks = SimpleNamespace(create_task=lambda coro: coro.close(), terminate=lambda: None)
    instance.update_times = AsyncMock()
    instance.process_chat_data = AsyncMock()
    return instance


@pytest.mark.asyncio
async def test_run_recovers_after_exhaustion_and_metadata_failure(monkeypatch):
    instance = room_instance()
    instance.youtube_chat.next.side_effect = [ProviderTemporarilyUnavailable("503"), ChatData([], [], []), None]
    instance.youtube_chat.fetch_metadata.side_effect = ValueError("invalid metadata")
    monkeypatch.setattr("omu_chat_youtube.chat.asyncio.sleep", AsyncMock())
    await instance.run()
    instance.process_chat_data.assert_awaited_once()
    assert instance.youtube_chat.next.await_count == 3
    assert instance.closed


@pytest.mark.asyncio
@pytest.mark.parametrize("phase", ["retry_wait", "fetch"])
async def test_stop_cancels_waiting_or_fetching_run(monkeypatch, phase):
    instance = room_instance()
    waiting = asyncio.Event()

    async def wait(*args):
        waiting.set()
        await asyncio.Event().wait()

    if phase == "retry_wait":
        instance.youtube_chat.next.side_effect = ProviderTemporarilyUnavailable("503")
        monkeypatch.setattr("omu_chat_youtube.chat.asyncio.sleep", wait)
    else:
        instance.youtube_chat.next.side_effect = wait
    task = asyncio.create_task(instance.run())
    await asyncio.wait_for(waiting.wait(), 1)
    instance.update_times.side_effect = ProviderTemporarilyUnavailable("503")
    await instance.stop()
    with pytest.raises(asyncio.CancelledError):
        await asyncio.wait_for(task, 1)
    assert not instance.room.connected
    assert instance.room.status == "offline"
    instance.chat.rooms.update.assert_awaited()


@pytest.mark.asyncio
async def test_programming_error_in_message_processing_is_not_retried():
    instance = room_instance()
    instance.youtube_chat.next.return_value = ChatData([], [], [])
    instance.process_chat_data.side_effect = RuntimeError("bug")
    with pytest.raises(RuntimeError, match="bug"):
        await instance.run()
    assert instance.youtube_chat.next.await_count == 1

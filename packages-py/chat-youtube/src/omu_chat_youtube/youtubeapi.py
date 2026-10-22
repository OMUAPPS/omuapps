from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from typing import Any

import aiohttp
import bs4
from loguru import logger
from omu import Omu
from omu_chatprovider.errors import ProviderError, ProviderTemporarilyUnavailable
from omu_chatprovider.helper import assert_none
from omu_chatprovider.throttle import Throttle

from . import types
from .const import (
    BASE_HEADERS,
    BASE_PAYLOAD,
    YOUTUBE_REGEX,
    YOUTUBE_URL,
)


class YoutubePage:
    def __init__(
        self,
        soup: bs4.BeautifulSoup,
    ):
        self.soup = soup

    @classmethod
    async def from_response(cls, response: aiohttp.ClientResponse) -> YoutubePage:
        response_text = await response.text()
        soup = bs4.BeautifulSoup(response_text, "html.parser")
        return cls(soup)

    def get_ytcfg(self) -> types.ytcfg:
        ytcfg_data = self.extract_script("ytcfg.set")
        return assert_none(
            ytcfg_data,
            "Could not find ytcfg data",
        )

    def get_ytinitialdata(self) -> types.ytinitialdata | None:
        initial_data = self.extract_script("var ytInitialData =")
        initial_data = initial_data or self.extract_script('window["ytInitialData"]')
        return initial_data

    def get_ytinitialplayerresponse(self) -> types.ytInitialPlayerResponse:
        initial_player_response = self.extract_script("var ytInitialPlayerResponse")
        return assert_none(
            initial_player_response,
            "Could not find initial player response",
        )

    @property
    def INNERTUBE_API_KEY(self) -> str:
        return self.get_ytcfg()["INNERTUBE_API_KEY"]

    def extract_script(self, prefix: str) -> Any | None:
        for script in self.soup.select("script"):
            script_text = script.text.strip()
            if script_text.startswith(prefix):
                break
        else:
            return None
        if "{" not in script_text or "}" not in script_text:
            return None
        data_text = script_text[script_text.index("{") : script_text.rindex("}") + 1]
        data = json.loads(data_text)
        return data


class YoutubeAPI:
    def __init__(self, omu: Omu, session: aiohttp.ClientSession):
        self.omu = omu
        self.session = session
        self.throttle = Throttle(timedelta(seconds=1 / 3))

    async def get(
        self,
        url: str,
        params: dict[str, str] | None = None,
    ) -> YoutubePage:
        try:
            async with self.throttle:
                response = await self.session.get(url, params=params, headers=BASE_HEADERS)
            if response.status // 100 != 2:
                response.release()
                raise ProviderTemporarilyUnavailable(f"page HTTP {response.status}")
            return await YoutubePage.from_response(response)
        except (aiohttp.ClientError, TimeoutError, ValueError) as e:
            raise ProviderTemporarilyUnavailable(f"page: {type(e).__name__}") from e

    async def _post_json(self, url: str, params: dict[str, str], payload: dict[str, Any]) -> Any:
        stage = url.rsplit("/", 1)[-1]
        try:
            async with self.throttle:
                response = await self.session.post(url, params=params, headers=BASE_HEADERS, json=payload)
            if response.status // 100 != 2:
                response.release()
                raise ProviderTemporarilyUnavailable(f"{stage} HTTP {response.status}")
            data = await response.json()
            if not isinstance(data, dict):
                raise ProviderTemporarilyUnavailable(f"{stage}: expected JSON object")
            if "error" in data:
                error = data["error"]
                code = error.get("code") if isinstance(error, dict) else None
                raise ProviderTemporarilyUnavailable(f"{stage} API error {code}")
            return data
        except (aiohttp.ClientError, TimeoutError, ValueError) as e:
            raise ProviderTemporarilyUnavailable(f"{stage}: {type(e).__name__}") from e

    async def fetch_online_videos(self, url: str) -> list[str]:
        match = assert_none(
            re.search(YOUTUBE_REGEX, url),
            "Could not match url",
        )
        options = match.groupdict()

        video_id = options.get("video_id") or options.get("video_id_short")
        if video_id is None:
            channel_id = options.get("channel_id") or await self.get_channel_id_by_vanity(
                options.get("channel_id_vanity") or options.get("channel_id_user") or options.get("channel_id_c")
            )
            if channel_id is None:
                raise ProviderError("Could not find channel id")
            video_id = await self.get_video_id_by_channel(channel_id)
            if video_id is None:
                return []
        if not await self.is_online(video_id):
            return []
        return [video_id]

    async def get_channel_id_by_vanity(self, vanity_id: str | None) -> str | None:
        if vanity_id is None:
            return None
        async with self.throttle:
            response = await self.session.get(f"{YOUTUBE_URL}/@{vanity_id}")
        soup = bs4.BeautifulSoup(await response.text(), "html.parser")
        meta_tag = soup.select_one('meta[itemprop="identifier"]')
        if meta_tag is None:
            return None
        return meta_tag.attrs.get("content")

    async def get_video_id_by_channel(self, channel_id: str) -> str | None:
        async with self.throttle:
            response = await self.session.get(
                f"{YOUTUBE_URL}/embed/live_stream?channel={channel_id}",
                headers=BASE_HEADERS,
            )
        soup = bs4.BeautifulSoup(await response.text(), "html.parser")
        canonical_link = soup.select_one('link[rel="canonical"]')
        if canonical_link is None:
            return await self.get_video_id_by_channel_page(channel_id)
        href = canonical_link.attrs.get("href")
        if href is None:
            return None
        match = re.search(YOUTUBE_REGEX, href)
        if match is None:
            return None
        options = match.groupdict()
        return options.get("video_id") or options.get("video_id_short")

    async def get_video_id_by_channel_page(self, channel_id: str) -> str | None:
        async with self.throttle:
            response = await self.session.get(
                f"{YOUTUBE_URL}/channel/{channel_id}",
                headers=BASE_HEADERS,
            )
        if not response.ok:
            return
        page = await YoutubePage.from_response(response)
        data = page.get_ytinitialdata()
        if data is None:
            raise ProviderError(f"Could not get initial data for channel {channel_id}")
        video_id = (
            data.get("header", {})
            .get("pageHeaderRenderer", {})
            .get("content", {})
            .get("pageHeaderViewModel", {})
            .get("image", {})
            .get("decoratedAvatarViewModel", {})
            .get("rendererContext", {})
            .get("commandContext", {})
            .get("onTap", {})
            .get("innertubeCommand", {})
            .get("watchEndpoint", {})
            .get("videoId", None)
        )
        return video_id

    async def get_live_chat(
        self,
        /,
        video_id: str,
        key: str,
        continuation: str | None = None,
    ) -> types.live_chat:
        url = f"{YOUTUBE_URL}/youtubei/v1/live_chat/get_live_chat"
        params = {
            "v": video_id,
            "key": key,
        }
        payload: dict[str, Any] = {
            **BASE_PAYLOAD,
        }
        if continuation:
            payload["continuation"] = continuation
        return await self._post_json(url, params, payload)

    async def updated_metadata(
        self,
        /,
        video_id: str,
        key: str,
        continuation: str | None = None,
    ) -> types.updated_metadata:
        url = f"{YOUTUBE_URL}/youtubei/v1/updated_metadata"
        params = {
            "key": key,
        }
        payload: dict[str, Any] = {
            **BASE_PAYLOAD,
        }
        if continuation is not None:
            payload["continuation"] = continuation
        elif video_id is not None:
            payload["videoId"] = video_id
        else:
            raise ValueError("video_id or continuation must be provided")
        return await self._post_json(url, params, payload)

    async def is_online(self, video_id: str) -> bool:
        try:
            page = await self.get(f"{YOUTUBE_URL}/live_chat", {"v": video_id})
            continuation = extract_chat_continuation(page)
            if continuation is None:
                raise ProviderTemporarilyUnavailable("live_chat: missing continuation")
            data = await self.get_live_chat(video_id=video_id, key=page.INNERTUBE_API_KEY, continuation=continuation)
            if isinstance(data.get("continuationContents", {}).get("liveChatContinuation"), dict):
                return True
            raise ProviderTemporarilyUnavailable("get_live_chat: missing chat contents")
        except (ProviderTemporarilyUnavailable, ValueError, KeyError, TypeError, AttributeError, IndexError) as e:
            if await self.has_ended(video_id):
                return False
            detail = str(e) if isinstance(e, ProviderTemporarilyUnavailable) else type(e).__name__
            raise ProviderTemporarilyUnavailable(f"{video_id}: online check: {detail}") from e

    async def has_ended(self, video_id: str) -> bool:
        try:
            page = await self.get(f"{YOUTUBE_URL}/watch", {"v": video_id})
            player = page.get_ytinitialplayerresponse()
            details = player.get("microformat", {}).get("playerMicroformatRenderer", {}).get("liveBroadcastDetails", {})
            end = details.get("endTimestamp")
            if not isinstance(end, str) or not end:
                return False
            # Validate the end marker before treating an unfamiliar response as final.
            datetime.fromisoformat(end)
        except (ProviderTemporarilyUnavailable, ValueError, KeyError, TypeError, AttributeError):
            return False
        logger.info(f"YouTube {video_id}: stream ended (endTimestamp confirmed)")
        return True


def extract_chat_continuation(page: YoutubePage) -> str | None:
    initial_data = page.get_ytinitialdata() or {}
    continuations = initial_data.get("contents", {}).get("liveChatRenderer", {}).get("continuations", [])
    return extract_continuation(continuations)


def extract_continuation(continuations: list) -> str | None:
    for continuation in continuations:
        for kind in ("invalidationContinuationData", "timedContinuationData", "reloadContinuationData"):
            value = continuation.get(kind, {}).get("continuation")
            if isinstance(value, str) and value:
                return value
    return None

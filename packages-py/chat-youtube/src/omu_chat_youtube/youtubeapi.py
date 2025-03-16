from __future__ import annotations

import json
import re
from datetime import timedelta
from typing import Any

import aiohttp
import bs4
from omu import Omu
from omu_chatprovider.errors import ProviderError
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
        initial_data = self.extract_script('window["ytInitialData"]')
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
        async with self.throttle:
            response = await self.session.get(
                url,
                params=params,
                headers=BASE_HEADERS,
            )
        return await YoutubePage.from_response(response)

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
            return await self.get_video_id_by_channel_feeds(channel_id)
        href = canonical_link.attrs.get("href")
        if href is None:
            return None
        match = re.search(YOUTUBE_REGEX, href)
        if match is None:
            return None
        options = match.groupdict()
        return options.get("video_id") or options.get("video_id_short")

    async def get_video_id_by_channel_feeds(self, channel_id: str) -> str | None:
        async with self.throttle:
            response = await self.session.get(
                f"{YOUTUBE_URL}/feeds/videos.xml?channel_id={channel_id}",
                headers=BASE_HEADERS,
            )
        soup = bs4.BeautifulSoup(await response.text(), "xml")
        link = soup.select_one("entry link")
        if link is None:
            return None
        href = link.attrs.get("href")
        if href is None:
            return None
        match = re.search(YOUTUBE_REGEX, href)
        if match is None:
            return None
        options = match.groupdict()
        return options.get("video_id") or options.get("video_id_short")

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
        async with self.throttle:
            response = await self.session.post(
                url,
                params=params,
                headers=BASE_HEADERS,
                json=payload,
            )
        return await response.json()

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
        async with self.throttle:
            response = await self.session.post(
                url,
                params=params,
                headers=BASE_HEADERS,
                json=payload,
            )
        return await response.json()

    async def is_online(self, video_id: str) -> bool:
        live_chat_params = {"v": video_id}
        async with self.throttle:
            live_chat_response = await self.session.get(
                f"{YOUTUBE_URL}/live_chat",
                params=live_chat_params,
                headers=BASE_HEADERS,
            )
        if live_chat_response.status // 100 != 2:
            return False
        response = await YoutubePage.from_response(live_chat_response)
        initial_data = response.get_ytinitialdata()
        if initial_data is None:
            return False
        continuation = (
            initial_data.get("contents", {})
            .get("liveChatRenderer", {})
            .get("continuations", [{}])[0]
            .get("invalidationContinuationData", {})
            .get("continuation")
        )
        if continuation is None:
            return False
        live_chat_response_data = await self.get_live_chat(
            video_id=video_id,
            key=response.get_ytcfg()["INNERTUBE_API_KEY"],
            continuation=continuation,
        )
        return "continuationContents" in live_chat_response_data

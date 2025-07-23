from __future__ import annotations

import json
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any, Final, TypedDict

import bs4
from aiohttp import ClientSession

from .gql import GQLResponse
from .types.channelroot_aboutpanel import ChannelRoot_AboutPanel, ChannelRoot_AboutPanelResponse
from .types.models import PlaybackAccessTokenValue, StreamMetadataUser
from .types.playback_access_token_template import PlaybackAccessTokenTemplate
from .types.stream_metadata import StreamMetadata
from .types.viewer_card import ViewerCard, ViewerCardResponse

# https://assets.twitch.tv/assets/core-8854d54db6b54a786271.js


class MappingEntry(TypedDict):
    hash: str
    query: str


MAPPINGS: Final[dict[str, MappingEntry]] = {}
MAPPING_LOCK: Final = Lock()


def import_hashes():
    with MAPPING_LOCK:
        global MAPPINGS
        path = Path(__file__).parent / "gql_mappings.json"
        text = path.read_text(encoding="utf-8")
        MAPPINGS.update(json.loads(text))


threading.Thread(target=import_hashes).start()


def wait_for_import():
    while not MAPPINGS:
        ...


@dataclass(frozen=True, slots=True)
class TwitchAPI:
    session: ClientSession
    client_id: str

    @classmethod
    async def create(cls, session: ClientSession | None = None) -> TwitchAPI:
        if session is None:
            session = ClientSession()
        client_id = await cls.fetch_client_id(session)
        return cls(
            session=session,
            client_id=client_id,
        )

    @staticmethod
    async def fetch_client_id(session: ClientSession) -> str:
        url = "https://twitch.tv"
        res = await session.get(url)
        regex = re.compile(r"clientId=\"(?P<clientId>\w+)\"")
        soup = bs4.BeautifulSoup(await res.text(), "html.parser")
        for script in soup.select("script"):
            if not script.string:
                continue
            match = regex.search(script.string)
            if match:
                return match.group("clientId")
        raise ValueError("Client ID not found")

    async def gql(self, operation_name: str, variables: Any, query_data: str | None = None) -> Any:
        wait_for_import()
        payload = {
            "operationName": operation_name,
            "variables": variables,
        }
        persisted_hash = MAPPINGS.get(operation_name)
        if persisted_hash:
            payload |= {
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": persisted_hash["hash"],
                    }
                }
            }
        if query_data:
            payload |= {"query": query_data}
        res = await self.session.post(
            "https://gql.twitch.tv/gql",
            json=payload,
            headers={"Client-Id": self.client_id},
        )
        data: GQLResponse = await res.json()
        if "errors" in data:
            raise ValueError(data["errors"])
        return data["data"]

    async def fetch_stream_metadata(self, user_login: str) -> StreamMetadataUser | None:
        res = await StreamMetadata.query(
            self,
            {"channelLogin": user_login, "includeIsDJ": True},
        )
        return res.get("user")

    async def fetch_viewer_card(self, channel_login: str, recipient_login: str) -> ViewerCardResponse:
        return await ViewerCard.query(
            self,
            {
                "channelLogin": channel_login,
                "hasChannelID": False,
                "giftRecipientLogin": recipient_login,
                "isViewerBadgeCollectionEnabled": False,
                "withStandardGifting": True,
                "badgeSourceChannelLogin": channel_login,
            },
        )

    async def fetch_channelroot_aboutpanel(self, channel_login: str) -> ChannelRoot_AboutPanelResponse:
        res = await ChannelRoot_AboutPanel.query(
            self,
            {
                "channelLogin": channel_login,
                "includeIsDJ": True,
                "skipSchedule": False,
            },
        )
        return res

    async def fetch_playback_access_token(self, login: str) -> PlaybackAccessTokenValue:
        # Hardcoded query
        QUERY = 'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!, $platform: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature   authorization { isForbidden forbiddenReasonCode }   __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature   __typename  }}'
        res = await PlaybackAccessTokenTemplate.query(
            self,
            {
                "isLive": True,
                "isVod": False,
                "login": login,
                "vodID": "",
                "platform": "web",
                "playerType": "site",
            },
            query=QUERY,
        )
        value = json.loads(res["streamPlaybackAccessToken"]["value"])
        return PlaybackAccessTokenValue(**value)

    async def fetch_channel_id(self, channel_login: str) -> int:
        res = await self.fetch_playback_access_token(channel_login)
        channel_id = res["channel_id"]
        return channel_id

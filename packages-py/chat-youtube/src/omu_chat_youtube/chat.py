from __future__ import annotations

import asyncio
import json
import re
import urllib.parse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING

import bs4
from iwashi.service import Youtube
from loguru import logger
from omu.helper import map_optional
from omu_chat import Chat
from omu_chat.model import (
    MODERATOR,
    OWNER,
    VERIFIED,
    Author,
    AuthorMetadata,
    Gift,
    Message,
    Paid,
    Reaction,
    Role,
    Room,
    RoomMetadata,
    Vote,
    content,
)
from omu_chat.model.vote import Choice
from omu_chatprovider.errors import ProviderError
from omu_chatprovider.helper import traverse
from omu_chatprovider.service import ChatService
from omu_chatprovider.tasks import Tasks

from . import types
from .const import (
    YOUTUBE_URL,
)
from .types.accessibility import Accessibility
from .types.chatactions import (
    AddChatItemActionItem,
    AuthorInfo,
    ChatActions,
    LiveChatPaidMessageRenderer,
    LiveChatRenderer,
    MarkChatItemAsDeletedAction,
    UpdateLiveChatPollAction,
)
from .types.frameworkupdates import (
    Mutations,
)
from .types.image import Thumbnail
from .types.metadataactions import MetadataActions
from .types.runs import Runs
from .youtubeapi import YoutubeAPI, YoutubePage

if TYPE_CHECKING:
    from .youtube import YoutubeChatService

YOUTUBE_VISITOR = Youtube()


class YoutubeChatAPI:
    def __init__(
        self,
        video_id: str,
        extractor: YoutubeAPI,
        response: YoutubePage,
        continuation: str | None = None,
    ):
        self.video_id = video_id
        self.api = extractor
        self.response = response
        self.api_key = response.INNERTUBE_API_KEY
        self.chat_continuation = continuation
        self.metadata_continuation: str | None = None

    @classmethod
    async def from_video_id(cls, extractor: YoutubeAPI, video_id: str):
        chat_page = await extractor.get(
            f"{YOUTUBE_URL}/live_chat",
            params={"v": video_id},
        )
        continuation = cls.extract_chat_continuation(chat_page)
        if continuation is None:
            raise ProviderError("Could not find continuation")
        return cls(
            video_id,
            extractor,
            chat_page,
            continuation,
        )

    @classmethod
    def extract_chat_continuation(cls, page: YoutubePage) -> str | None:
        initial_data = page.get_ytinitialdata()
        if initial_data is None:
            return None
        return (
            traverse(initial_data)
            .map(lambda x: x.get("contents"))
            .map(lambda x: x.get("liveChatRenderer"))
            .map(lambda x: x.get("continuations"))
            .map(lambda x: x[0])
            .map(lambda x: x.get("invalidationContinuationData"))
            .map(lambda x: x.get("continuation"))
            .get()
        )

    @classmethod
    def extract_script(cls, soup: bs4.BeautifulSoup, startswith: str) -> dict | None:
        for script in soup.select("script"):
            script_text = script.text.strip()
            if script_text.startswith(startswith):
                break
        else:
            return None
        if "{" not in script_text or "}" not in script_text:
            return None
        data_text = script_text[script_text.index("{") : script_text.rindex("}") + 1]
        data = json.loads(data_text)
        return data

    async def is_online(self) -> bool:
        live_chat_params = {"v": self.video_id}
        live_chat_page = await self.api.get(
            f"{YOUTUBE_URL}/live_chat",
            params=live_chat_params,
        )
        continuation = self.extract_chat_continuation(live_chat_page)
        if continuation is None:
            return False
        live_chat_response_data = await self.api.get_live_chat(
            video_id=self.video_id,
            key=self.api_key,
            continuation=continuation,
        )
        return "continuationContents" in live_chat_response_data

    async def fetch(self, retry: int = 3) -> types.live_chat:
        data = await self.api.get_live_chat(
            video_id=self.video_id,
            key=self.api_key,
            continuation=self.chat_continuation,
        )
        return data

    async def next(self) -> ChatData | None:
        data: types.live_chat = await self.fetch()
        if "continuationContents" not in data:
            return None
        live_chat_continuation = data["continuationContents"]["liveChatContinuation"]
        continuations = live_chat_continuation["continuations"]
        if len(continuations) == 0:
            self.chat_continuation = None
        else:
            continuation = continuations[0]
            self.chat_continuation = continuation.get("invalidationContinuationData", {}).get("continuation", None)
        chat_actions = live_chat_continuation.get("actions", [])
        mutations = (
            traverse(data)
            .map(lambda x: x.get("frameworkUpdates"))
            .map(lambda x: x.get("entityBatchUpdate"))
            .map(lambda x: x.get("mutations"))
            .get()
            or []
        )
        return ChatData(
            chat_actions=chat_actions,
            metadata_actions=[],
            mutations=mutations,
        )

    async def fetch_metadata(self) -> RoomMetadata:
        data = await self.api.updated_metadata(
            video_id=self.video_id,
            key=self.api_key,
            continuation=self.metadata_continuation,
        )
        self.metadata_continuation = (
            traverse(data)
            .map(lambda x: x.get("continuation"))
            .map(lambda x: x.get("timedContinuationData"))
            .map(lambda x: x.get("continuation"))
            .get()
        )
        viewer_count: int | None = None
        title: content.Component | None = None
        description: content.Component | None = None
        for action in data.get("actions", []):
            if "updateViewershipAction" in action:
                update_viewership = action["updateViewershipAction"]
                view_count_data = update_viewership["viewCount"]
                video_view_count_data = view_count_data["videoViewCountRenderer"]
                viewer_count = int(video_view_count_data["originalViewCount"])
            if "updateTitleAction" in action:
                title = _parse_runs(action["updateTitleAction"]["title"])
            if "updateDescriptionAction" in action:
                description = _parse_runs(action["updateDescriptionAction"].get("description"))
        metadata = RoomMetadata()
        if viewer_count:
            metadata["viewers"] = viewer_count
        if title:
            metadata["title"] = str(title)
        if description:
            metadata["description"] = str(description)
        return metadata


@dataclass(frozen=True, slots=True)
class ChatData:
    chat_actions: ChatActions
    metadata_actions: MetadataActions
    mutations: Mutations


class YoutubeChat(ChatService):
    def __init__(
        self,
        youtube_service: YoutubeChatService,
        chat: Chat,
        room: Room,
        youtube_chat: YoutubeChatAPI,
    ):
        self.youtube = youtube_service
        self.chat = chat
        self._room = room
        self.youtube_chat = youtube_chat
        self.tasks = Tasks(asyncio.get_running_loop())
        self.author_fetch_queue: list[Author] = []
        self._closed = False

    @property
    def room(self) -> Room:
        return self._room

    @property
    def closed(self) -> bool:
        return self._closed

    @classmethod
    async def create(
        cls,
        youtube_service: YoutubeChatService,
        chat: Chat,
        room: Room,
    ):
        exist_room = await chat.rooms.get(room.id.key())
        if exist_room:
            room.metadata |= exist_room.metadata
        await chat.rooms.update(room)
        video_id = room.id.path[-1]
        youtube_chat = await YoutubeChatAPI.from_video_id(
            youtube_service.extractor,
            video_id,
        )
        room.metadata |= {
            "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
            "url": f"https://www.youtube.com/watch?v={video_id}",
        }
        instance = cls(youtube_service, chat, room, youtube_chat)
        await instance.update_times()
        await chat.rooms.add(room)
        return instance

    async def update_times(self):
        watch_page = await self.youtube.extractor.get(
            f"{YOUTUBE_URL}/watch",
            params={"v": self.youtube_chat.video_id},
        )
        player_res = watch_page.get_ytinitialplayerresponse()
        microformat = (
            traverse(player_res)
            .map(lambda x: x.get("microformat"))
            .map(lambda x: x.get("playerMicroformatRenderer"))
            .get()
        )
        broadcast_details = microformat.get("liveBroadcastDetails") if microformat else None
        if microformat and "publishDate" in microformat:
            created_at = datetime.fromisoformat(microformat["publishDate"])
            self.room.metadata |= {
                "created_at": created_at.isoformat(),
            }
        if broadcast_details:
            if "startTimestamp" in broadcast_details:
                started_at = datetime.fromisoformat(broadcast_details["startTimestamp"])
                self.room.metadata["started_at"] = started_at.isoformat()
            if "endTimestamp" in broadcast_details:
                ended_at = datetime.fromisoformat(broadcast_details["endTimestamp"])
                self.room.metadata["ended_at"] = ended_at.isoformat()

    async def run(self):
        count = 0
        self.tasks.create_task(self.fetch_authors_task())
        try:
            self._room.connected = True
            await self.chat.rooms.update(self._room)
            while not self._closed:
                chat_data = await self.youtube_chat.next()
                if chat_data is None:
                    break
                await self.process_chat_data(chat_data)
                await asyncio.sleep(1 / 3)
                if count % 10 == 0:
                    self.room.metadata |= await self.youtube_chat.fetch_metadata()
                    await self.chat.rooms.update(self.room)
                count += 1
        finally:
            await self.stop()

    async def process_chat_data(self, chat_data: ChatData):
        messages: list[Message] = []
        authors: list[Author] = []
        for action in chat_data.chat_actions:
            if "addChatItemAction" in action:
                await self.process_message_item(
                    action["addChatItemAction"]["item"],
                    messages,
                    authors,
                )
            elif "addLiveChatTickerItemAction" in action:
                pass
            elif "markChatItemAsDeletedAction" in action:
                await self.process_deleted_item(action["markChatItemAsDeletedAction"])
            elif "removeChatItemAction" in action:
                await self.process_deleted_item(action["removeChatItemAction"])
            elif "removeChatItemByAuthorAction" in action:
                pass
            elif "updateLiveChatPollAction" in action:
                await self.process_poll_action(action["updateLiveChatPollAction"])
            else:
                logger.warning(f"Unknown chat action: {action}")
        if len(authors) > 0:
            to_fetch_authors = [author for author in authors if author.id.key() not in self.chat.authors.cache]
            self.author_fetch_queue.extend(to_fetch_authors)
            new_authors = [author for author in authors if await self.chat.authors.get(author.id.key()) is None]
            await self.chat.authors.add(*new_authors)
        if len(messages) > 0:
            await self.chat.messages.add(*messages)
            await self.update_message_ids(messages)
        await self.process_reactions(chat_data)

    async def update_message_ids(self, messages):
        if not self._room.metadata.get("first_message_id"):
            self._room.metadata["first_message_id"] = messages[0].id.key()
        self._room.metadata["last_message_id"] = messages[-1].id.key()
        await self.chat.rooms.update(self._room)

    async def fetch_authors_task(self):
        try:
            while not self._closed:
                if len(self.author_fetch_queue) == 0:
                    await asyncio.sleep(1)
                    continue
                for author in self.author_fetch_queue:
                    await asyncio.sleep(3)
                    new_metadata = await self.fetch_author_metadata(author)
                    metadata = author.metadata or {}
                    metadata |= new_metadata
                    author.metadata = metadata
                    await self.chat.authors.update(author)
        except asyncio.CancelledError:
            return

    async def fetch_author_metadata(self, author: Author) -> AuthorMetadata:
        try:
            author_channel = await YOUTUBE_VISITOR.visit_url(
                self.youtube.session,
                f"https://youtube.com/channel/{author.id.path[-1]}",
            )
        except Exception as e:
            logger.error(f"Could not fetch author metadata: {e}")
            return {}
        if author_channel is None:
            return {}
        new_metadata: AuthorMetadata = {}
        new_metadata["avatar_url"] = author_channel.profile_picture
        new_metadata["url"] = author_channel.url
        new_metadata["links"] = list(author_channel.links)
        new_metadata["screen_id"] = author_channel.id
        return new_metadata

    async def process_message_item(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        if "liveChatTextMessageRenderer" in item:
            data = item["liveChatTextMessageRenderer"]
            author = self._parse_author(data)
            message = _parse_runs(data["message"])
            created_at = self._parse_created_at(data)
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                content=message,
                created_at=created_at,
            )
            messages.append(message)
            authors.append(author)
        elif "liveChatPaidMessageRenderer" in item:
            data = item["liveChatPaidMessageRenderer"]
            author = self._parse_author(data)
            message = map_optional(data.get("message"), _parse_runs)
            paid = self._parse_paid(data)
            created_at = self._parse_created_at(data)
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                content=message,
                paid=paid,
                created_at=created_at,
            )
            messages.append(message)
            authors.append(author)
        elif "liveChatMembershipItemRenderer" in item:
            data = item["liveChatMembershipItemRenderer"]
            author = self._parse_author(data)
            created_at = self._parse_created_at(data)
            component = content.System.of(_parse_runs(data["headerSubtext"]))
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                content=component,
                created_at=created_at,
            )
            messages.append(message)
            authors.append(author)
        elif "liveChatSponsorshipsGiftRedemptionAnnouncementRenderer" in item:
            data = item["liveChatSponsorshipsGiftRedemptionAnnouncementRenderer"]
            author = self._parse_author(data)
            created_at = self._parse_created_at(data)
            component = content.System.of(_parse_runs(data["message"]))
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                content=component,
                created_at=created_at,
            )
            messages.append(message)
            authors.append(author)
        elif "liveChatSponsorshipsGiftPurchaseAnnouncementRenderer" in item:
            data = item["liveChatSponsorshipsGiftPurchaseAnnouncementRenderer"]
            created_at = self._parse_created_at(data)
            header = data["header"]["liveChatSponsorshipsHeaderRenderer"]
            author = self._parse_author(header, id=data["authorExternalChannelId"])
            component = content.System.of(_parse_runs(header["primaryText"]))

            gift_image = header["image"]
            gift_name = _get_accessibility_label(gift_image.get("accessibility"))
            image_url = _get_best_thumbnail(gift_image["thumbnails"])
            gift = Gift(
                id="liveChatSponsorshipsGiftPurchaseAnnouncement",
                name=gift_name,
                amount=1,
                is_paid=True,
                image_url=image_url,
            )
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                content=component,
                created_at=created_at,
                gifts=[gift],
            )
            messages.append(message)
            authors.append(author)
        elif "liveChatPlaceholderItemRenderer" in item:
            """
            item["liveChatPlaceholderItemRenderer"] = {'id': 'ChwKGkNJdml3ZUg0aDRRREZSTEV3Z1FkWUlJTkNR', 'timestampUsec': '1706714981296711'}}
            """
        elif "liveChatPaidStickerRenderer" in item:
            data = item["liveChatPaidStickerRenderer"]
            author = self._parse_author(data)
            created_at = self._parse_created_at(data)
            sticker = data["sticker"]
            sticker_image = _get_best_thumbnail(sticker["thumbnails"])
            sticker_name = _get_accessibility_label(sticker.get("accessibility"))
            sticker = Gift(
                id="liveChatPaidSticker",
                name=sticker_name,
                amount=1,
                is_paid=True,
                image_url=sticker_image,
            )
            message = Message(
                id=self.room.id / data["id"],
                room_id=self._room.id,
                author_id=author.id,
                gifts=[sticker],
                created_at=created_at,
            )
            messages.append(message)
            authors.append(author)
        else:
            raise ProviderError(f"Unknown message type: {list(item.keys())} {item=}")

    async def process_deleted_item(self, item: MarkChatItemAsDeletedAction):
        id = self._room.id / item["targetItemId"]
        message = await self.chat.messages.get(id.key())
        if message:
            message.deleted = True
            await self.chat.messages.update(message)

    async def process_poll_action(self, action: UpdateLiveChatPollAction):
        poll_renderer = action["pollToUpdate"]["pollRenderer"]
        id = poll_renderer["liveChatPollId"]
        header = poll_renderer["header"]["pollHeaderRenderer"]
        title = _parse_runs(header["pollQuestion"])
        choices = self.parse_poll_choices(poll_renderer)
        total = self.parse_total_vote_count(header["metadataText"])

        vote = Vote(
            id=self.room.id / id,
            room_id=self._room.id,
            title=str(title),
            choices=choices,
            total=total,
            ended=False,
        )
        await self.chat.votes.add(vote)

    def parse_poll_choices(self, poll_renderer):
        choices: list[Choice] = []
        for choice in poll_renderer["choices"]:
            text = _parse_runs(choice["text"])
            vote_ratio = choice.get("voteRatio", 0.0)
            choice = Choice(
                text=str(text),
                ratio=vote_ratio,
            )
            choices.append(choice)
        return choices

    def parse_total_vote_count(self, run_data: Runs) -> int | None:
        runs = run_data["runs"]
        if len(runs) == 0:
            return
        last = runs[-1]
        if "text" not in last:
            logger.warning(f"Could not find total votes: {run_data}")
            return
        total_text = last["text"]
        total_match = re.search(r"\d+", total_text)
        if total_match is None:
            logger.warning(f"Could not parse total votes: {total_text}")
            return
        total = int(total_match.group(0))
        return total

    async def process_reactions(self, chat_data: ChatData):
        reaction_counts: Counter[str] = Counter()
        for mutation_update in chat_data.mutations:
            payload = mutation_update.get("payload")
            if not payload or "emojiFountainDataEntity" not in payload:
                continue
            emoji_data = payload["emojiFountainDataEntity"]
            for bucket in emoji_data["reactionBuckets"]:
                reaction_counts.update({reaction["key"]: reaction["value"] for reaction in bucket.get("reactions", [])})
                reaction_counts.update(
                    {
                        reaction["unicodeEmojiId"]: reaction["reactionCount"]
                        for reaction in bucket.get("reactionsData", [])
                        if "unicodeEmojiId" in reaction
                    }
                )
        if not reaction_counts:
            return
        reaction = Reaction(
            room_id=self._room.id,
            reactions=reaction_counts,
        )
        await self.chat.reaction_signal.notify(reaction)

    def _parse_author(self, message: AuthorInfo, id: str | None = None) -> Author:
        name = traverse(message).map(lambda x: x.get("authorName")).map(lambda x: x.get("simpleText")).get()
        id = message.get("authorExternalChannelId") or id
        if id is None:
            raise ProviderError("Could not find author id")
        avatar_url = (
            traverse(message)
            .map(lambda x: x.get("authorPhoto"))
            .map(lambda x: x.get("thumbnails"))
            .map(lambda x: x[0])
            .map(lambda x: x.get("url"))
            .get()
        )
        roles: list[Role] = []
        for badge in message.get("authorBadges", []):
            if "icon" in badge["liveChatAuthorBadgeRenderer"]:
                icon_type = badge["liveChatAuthorBadgeRenderer"]["icon"]["iconType"]
                if icon_type == "MODERATOR":
                    roles.append(MODERATOR)
                elif icon_type == "OWNER":
                    roles.append(OWNER)
                elif icon_type == "VERIFIED":
                    roles.append(VERIFIED)
                else:
                    raise ProviderError(f"Unknown badge type: {icon_type}")
            elif "customThumbnail" in badge["liveChatAuthorBadgeRenderer"]:
                custom_thumbnail = badge["liveChatAuthorBadgeRenderer"]["customThumbnail"]
                roles.append(
                    Role(
                        id=custom_thumbnail["thumbnails"][0]["url"],
                        name=badge["liveChatAuthorBadgeRenderer"]["tooltip"],
                        icon_url=custom_thumbnail["thumbnails"][0]["url"],
                        is_owner=False,
                        is_moderator=False,
                    )
                )

        return Author(
            provider_id=self.youtube.provider.id,
            id=self.room.id / id,
            name=name,
            avatar_url=avatar_url,
            roles=roles,
        )

    def _parse_paid(self, message: LiveChatPaidMessageRenderer) -> Paid:
        currency_match = re.search(r"[^0-9]+", message["purchaseAmountText"]["simpleText"])
        if currency_match is None:
            raise ProviderError("Could not parse currency: " f"{message['purchaseAmountText']['simpleText']}")
        currency = currency_match.group(0)
        amount_match = re.search(r"[\d,\.]+", message["purchaseAmountText"]["simpleText"])
        if amount_match is None:
            raise ProviderError(f"Could not parse amount: {message['purchaseAmountText']['simpleText']}")
        amount = float(amount_match.group(0).replace(",", ""))

        return Paid(
            currency=currency,
            amount=amount,
        )

    def _parse_created_at(self, message: LiveChatRenderer) -> datetime:
        timestamp_usec = int(message["timestampUsec"])
        return datetime.fromtimestamp(
            timestamp_usec / 1000000,
            tz=datetime.now().astimezone().tzinfo,
        )

    async def stop(self):
        if self._closed:
            return
        self._closed = True
        self.tasks.terminate()
        self._room.connected = False
        await self.update_times()
        await self.chat.rooms.update(self._room)


def _get_accessibility_label(data: Accessibility | None) -> str | None:
    if data is None:
        return None
    return data.get("accessibilityData", {}).get("label", None)


def _get_best_thumbnail(thumbnails: list[Thumbnail]) -> str:
    if len(thumbnails) == 0:
        raise ProviderError("No thumbnails found")
    best = max(thumbnails, key=lambda x: x.get("width", 0) * x.get("height", 0))
    return normalize_yt_url(best["url"])


def _parse_runs(runs: Runs | None) -> content.Component:
    root = content.Root()
    if runs is None:
        return root
    for run in runs.get("runs", []):
        if "text" in run:
            if "navigationEndpoint" in run:
                endpoint = run.get("navigationEndpoint")
                if endpoint is None:
                    root.add(content.Text.of(run["text"]))
                elif "urlEndpoint" in endpoint:
                    url = endpoint["urlEndpoint"]["url"]
                    root.add(content.Link.of(url, content.Text.of(run["text"])))
            else:
                root.add(content.Text.of(run["text"]))
        elif "emoji" in run:
            emoji = run["emoji"]
            image_url = _get_best_thumbnail(emoji["image"]["thumbnails"])
            emoji_id = emoji["emojiId"]
            name = emoji["shortcuts"][0] if emoji.get("shortcuts") else None
            root.add(
                content.Image.of(
                    url=image_url,
                    id=emoji_id,
                    name=name,
                )
            )
        else:
            raise ProviderError(f"Unknown run: {run}")
    return root


def normalize_yt_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme or "https"
    host = parsed.netloc or parsed.hostname or "youtube.com"
    path = parsed.path or ""
    query = parsed.query or ""
    if query:
        return f"{scheme}://{host}{path}?{query}"
    return f"{scheme}://{host}{path}"

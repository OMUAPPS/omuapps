from __future__ import annotations

from typing import TYPE_CHECKING

from omu.helper import map_optional
from omu_chat.model import Author, Gift, Message, content

from omu_chat_youtube.ythelper import get_accessibility_label, get_best_thumbnail, parse_runs

from .types.chatactions import AddChatItemActionItem

if TYPE_CHECKING:
    from .chat import YoutubeChat

TEXT_MESSAGE_RENDERER = "liveChatTextMessageRenderer"
PAID_MESSAGE_RENDERER = "liveChatPaidMessageRenderer"
MEMBERSHIP_ITEM_RENDERER = "liveChatMembershipItemRenderer"
SPONSORSHIP_GIFT_REDEMPTION_RENDERER = "liveChatSponsorshipsGiftRedemptionAnnouncementRenderer"
SPONSORSHIP_GIFT_PURCHASE_RENDERER = "liveChatSponsorshipsGiftPurchaseAnnouncementRenderer"
PLACEHOLDER_ITEM_RENDERER = "liveChatPlaceholderItemRenderer"
PAID_STICKER_RENDERER = "liveChatPaidStickerRenderer"


class MessageHandler:
    """Base class for handling different types of YouTube live chat messages."""

    def __init__(self, chat_service: YoutubeChat):
        self.chat_service = chat_service

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        """Handle the message item and append to messages/authors lists."""
        raise NotImplementedError


class TextMessageHandler(MessageHandler):
    """Handler for text messages."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(TEXT_MESSAGE_RENDERER)
        if data is None:
            return
        author = self.chat_service._parse_author(data)
        message_content = parse_runs(data["message"])
        created_at = self.chat_service._parse_created_at(data)
        message = self.chat_service._create_message(data, author, message_content, created_at)
        messages.append(message)
        authors.append(author)


class PaidMessageHandler(MessageHandler):
    """Handler for paid messages."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(PAID_MESSAGE_RENDERER)
        if data is None:
            return
        author = self.chat_service._parse_author(data)
        message_content = map_optional(data.get("message"), parse_runs)
        paid = self.chat_service._parse_paid(data)
        created_at = self.chat_service._parse_created_at(data)
        message = self.chat_service._create_message(data, author, message_content, created_at, paid=paid)
        messages.append(message)
        authors.append(author)


class MembershipMessageHandler(MessageHandler):
    """Handler for membership messages."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(MEMBERSHIP_ITEM_RENDERER)
        if data is None:
            return
        author = self.chat_service._parse_author(data)
        created_at = self.chat_service._parse_created_at(data)
        component = content.System.of(parse_runs(data["headerSubtext"]))
        message = self.chat_service._create_message(data, author, component, created_at)
        messages.append(message)
        authors.append(author)


class SponsorshipGiftRedemptionHandler(MessageHandler):
    """Handler for sponsorship gift redemption announcements."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(SPONSORSHIP_GIFT_REDEMPTION_RENDERER)
        if data is None:
            return
        author = self.chat_service._parse_author(data)
        created_at = self.chat_service._parse_created_at(data)
        component = content.System.of(parse_runs(data["message"]))
        message = self.chat_service._create_message(data, author, component, created_at)
        messages.append(message)
        authors.append(author)


class SponsorshipGiftPurchaseHandler(MessageHandler):
    """Handler for sponsorship gift purchase announcements."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(SPONSORSHIP_GIFT_PURCHASE_RENDERER)
        if data is None:
            return
        created_at = self.chat_service._parse_created_at(data)
        header = data["header"]["liveChatSponsorshipsHeaderRenderer"]
        author = self.chat_service._parse_author(header, id=data["authorExternalChannelId"])
        component = content.System.of(parse_runs(header["primaryText"]))

        gift_image = header["image"]
        gift_name = get_accessibility_label(gift_image.get("accessibility"))
        image_url = get_best_thumbnail(gift_image["thumbnails"])
        gift = Gift(
            id="liveChatSponsorshipsGiftPurchaseAnnouncement",
            name=gift_name,
            amount=1,
            is_paid=True,
            image_url=image_url,
        )
        message = self.chat_service._create_message(data, author, component, created_at, gifts=[gift])
        messages.append(message)
        authors.append(author)


class PlaceholderMessageHandler(MessageHandler):
    """Handler for placeholder messages (no-op)."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        # Placeholder items are ignored
        pass


class PaidStickerHandler(MessageHandler):
    """Handler for paid stickers."""

    async def handle(
        self,
        item: AddChatItemActionItem,
        messages: list[Message],
        authors: list[Author],
    ) -> None:
        data = item.get(PAID_STICKER_RENDERER)
        if data is None:
            return
        author = self.chat_service._parse_author(data)
        created_at = self.chat_service._parse_created_at(data)
        sticker = data["sticker"]
        sticker_image = get_best_thumbnail(sticker["thumbnails"])
        sticker_name = get_accessibility_label(sticker.get("accessibility"))
        sticker_gift = Gift(
            id="liveChatPaidSticker",
            name=sticker_name,
            amount=1,
            is_paid=True,
            image_url=sticker_image,
        )
        message = self.chat_service._create_message(data, author, None, created_at, gifts=[sticker_gift])
        messages.append(message)
        authors.append(author)


def get_message_handler(renderer_type: str, chat_service: YoutubeChat) -> MessageHandler | None:
    """Factory function to get the appropriate message handler."""
    handlers = {
        TEXT_MESSAGE_RENDERER: TextMessageHandler,
        PAID_MESSAGE_RENDERER: PaidMessageHandler,
        MEMBERSHIP_ITEM_RENDERER: MembershipMessageHandler,
        SPONSORSHIP_GIFT_REDEMPTION_RENDERER: SponsorshipGiftRedemptionHandler,
        SPONSORSHIP_GIFT_PURCHASE_RENDERER: SponsorshipGiftPurchaseHandler,
        PLACEHOLDER_ITEM_RENDERER: PlaceholderMessageHandler,
        PAID_STICKER_RENDERER: PaidStickerHandler,
    }
    handler_class = handlers.get(renderer_type)
    if handler_class:
        return handler_class(chat_service)
    return None

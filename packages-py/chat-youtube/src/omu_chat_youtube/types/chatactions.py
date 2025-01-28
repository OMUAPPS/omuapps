from typing import Any, Literal, NotRequired, TypedDict

from .accessibility import Accessibility
from .image import Image, Thumbnails
from .runs import Runs
from .simpletext import SimpleText
from .tracking import ClickTrackingParams, TrackingParams
from .urlendpoint import ContextMenuEndpoint


class Icon(TypedDict):
    iconType: Literal["OWNER", "MODERATOR"]


class LiveChatAuthorBadgeRenderer(TypedDict):
    customThumbnail: Thumbnails
    tooltip: str
    accessibility: Accessibility
    icon: NotRequired[Icon]


class AuthorBadge(TypedDict):
    liveChatAuthorBadgeRenderer: LiveChatAuthorBadgeRenderer


class ClientResource(TypedDict):
    imageName: str


class Source(TypedDict):
    clientResource: ClientResource


class Sources(TypedDict):
    sources: list[Source]


class ImageTint(TypedDict):
    color: int


class BorderImageProcessor(TypedDict):
    imageTint: ImageTint


class Processor(TypedDict):
    bprderImageProcessor: BorderImageProcessor


class UnheartedIcon(TypedDict):
    sources: list[Source]
    processor: Processor


class CreatorHeartViewModel(TypedDict):
    creatorThumbnail: Thumbnails
    heartedIcon: Sources
    unheartedIcon: UnheartedIcon
    heartedHoverText: str
    heartedAccessibilityLabel: str
    unheartedAccessibilityLabel: str
    engagementStateKey: str


class CreatorHeartButton(TypedDict):
    creatorHeartViewModel: CreatorHeartViewModel


class LiveChatRenderer(TypedDict):
    id: str
    timestampUsec: str
    authorExternalChannelId: str
    message: Runs


class AuthorInfo(TypedDict):
    authorName: SimpleText
    authorPhoto: Thumbnails
    authorBadges: NotRequired[list[AuthorBadge]]


class LiveChatTextMessageRenderer(LiveChatRenderer, AuthorInfo):
    contextMenuEndpoint: ContextMenuEndpoint
    contextMenuAccessibility: Accessibility


class LiveChatPaidMessageRenderer(TrackingParams, LiveChatRenderer, AuthorInfo):
    purchaseAmountText: SimpleText
    headerBackgroundColor: int
    headerTextColor: int
    bodyBackgroundColor: int
    bodyTextColor: int
    authorNameTextColor: int
    contextMenuEndpoint: ContextMenuEndpoint
    timestampColor: int
    contextMenuAccessibility: Accessibility
    textInputBackgroundColor: int
    creatorHeartButton: CreatorHeartButton
    isV2Style: bool


class LiveChatPaidStickerRenderer(TrackingParams, LiveChatRenderer, AuthorInfo):
    sticker: Image
    purchaseAmountText: SimpleText
    contextMenuEndpoint: ContextMenuEndpoint
    contextMenuAccessibility: Accessibility


class LiveChatMembershipItemRenderer(LiveChatRenderer, AuthorInfo):
    headerSubtext: Runs


class LiveChatSponsorshipsHeaderRenderer(AuthorInfo):
    """
    "liveChatSponsorshipsHeaderRenderer": {
        "authorName": {
            "simpleText": "\u267e\ufe0f\u91ce\u3046\u3055\u304e"
        },
        "authorPhoto": {
            "thumbnails": [
                {
                    "url": "https://yt4.ggpht.com/-Rp0B3c4BDQcB71RKqitQdCu2L7h3EqNNqdoqPWvRC-TguuzDUztmy1hTSpqQeEC5RLqsgn3fyw=s32-c-k-c0x00ffffff-no-rj",
                    "width": 32,
                    "height": 32
                },
                {
                    "url": "https://yt4.ggpht.com/-Rp0B3c4BDQcB71RKqitQdCu2L7h3EqNqdoqPWvRC-TguuzDUztmy1hTSpqQeEC5RLqsgn3fyw=s64-c-k-c0x00ffffff-no-rj",
                    "width": 64,
                    "height": 64
                }
            ]
        },
        "primaryText": {
            "runs": [
                {
                    "text": "Gifted ",
                    "bold": true
                },
                {
                    "text": "5",
                    "bold": true
                },
                {
                    "text": " ",
                    "bold": true
                },
                {
                    "text": "Pekora Ch. \u514e\u7530\u307a\u3053\u3089",
                    "bold": true
                },
                {
                    "text": " memberships",
                    "bold": true
                }
            ]
        },
        "authorBadges": [
            {
                "liveChatAuthorBadgeRenderer": {
                    "customThumbnail": {
                        "thumbnails": [
                            {
                                "url": "https://yt3.ggpht.com/ikjRH2-DarXi4D9rQptqzbl34YrHSkAs7Uyq41itvqRiYYcpq2zNYC2scrZ9gbXQEhBuFfOZuw=s16-c-k",
                                "width": 16,
                                "height": 16
                            },
                            {
                                "url": "https://yt3.ggpht.com/ikjRH2-DarXi4D9rQptqzbl34YrHSkAs7Uyq41itvqRiYYcpq2zNYC2scrZ9gbXQEhBuFfOZuw=s32-c-k",
                                "width": 32,
                                "height": 32
                            }
                        ]
                    },
                    "tooltip": "Member (2 months)",
                    "accessibility": {
                        "accessibilityData": {
                            "label": "Member (2 months)"
                        }
                    }
                }
            }
        ],
        "contextMenuEndpoint": {
            "clickTrackingParams": "CAUQ3MMKIhMIgbSe1t6qhAMVVkP1BR04yA_O",
            "commandMetadata": {
                "webCommandMetadata": {
                    "ignoreNavigation": true
                }
            },
            "liveChatItemContextMenuEndpoint": {
                "params": "Q2g0S0hBb2FRMDlZUlRVNFJHVnhiMUZFUm1GNlJYZG5VV1JVWjAxTFRYY2FLU29uQ2hoVlF6RkVRMlZrVW1kSFNFSmtiVGd4UlRGc2JFeG9UMUVTQ3pOa2FIRlFWRXhzTkRoQklBSW9CRElhQ2hoVlEwcGpVbnA1Umw4MVNYRkxkM1ZsZW5WNmFXUTFaVkU0QWtnQVVDUSUzRA=="
            }
        },
        "contextMenuAccessibility": {
            "accessibilityData": {
                "label": "Chat actions"
            }
        },
        "image": {
            "thumbnails": [
                {
                    "url": "https://www.gstatic.com/youtube/img/sponsorships/sponsorships_gift_purchase_announcement_artwork.png"
                }
            ]
        }
    }
    """

    primaryText: Runs
    contextMenuEndpoint: ContextMenuEndpoint
    contextMenuAccessibility: Accessibility
    image: Image


class LiveChatSponsorshipsGiftPurchaseAnnouncementRendererHeader(TypedDict):
    liveChatSponsorshipsHeaderRenderer: LiveChatSponsorshipsHeaderRenderer


class LiveChatSponsorshipsGiftPurchaseAnnouncementRenderer(LiveChatRenderer):
    """
    {
        "liveChatSponsorshipsGiftPurchaseAnnouncementRenderer": {
            "id": "ChwKGkNPWEU1OERlcW9RREZhekV3Z1FkVGdNS013",
            "timestampUsec": "1707910568302677",
            "authorExternalChannelId": "UCJcRzyF_5IqKwuezuzid5eQ",
            "header": LiveChatSponsorshipsGiftPurchaseAnnouncementRendererHeader
        }
    }
    """

    header: LiveChatSponsorshipsGiftPurchaseAnnouncementRendererHeader


class AddChatItemActionItem(TypedDict):
    liveChatTextMessageRenderer: NotRequired[LiveChatTextMessageRenderer]
    liveChatPaidMessageRenderer: NotRequired[LiveChatPaidMessageRenderer]
    liveChatPaidStickerRenderer: NotRequired[LiveChatPaidStickerRenderer]
    liveChatMembershipItemRenderer: NotRequired[LiveChatMembershipItemRenderer]
    liveChatSponsorshipsGiftRedemptionAnnouncementRenderer: NotRequired[LiveChatTextMessageRenderer]
    liveChatSponsorshipsGiftPurchaseAnnouncementRenderer: NotRequired[
        LiveChatSponsorshipsGiftPurchaseAnnouncementRenderer
    ]


class AddChatItemAction(TypedDict):
    item: AddChatItemActionItem


class MarkChatItemAsDeletedAction(TypedDict):
    deletedStateMessage: Runs
    targetItemId: str


class AddLiveChatTickerItemActionItem(TypedDict):
    liveChatTickerPaidMessageItemRenderer: dict


class AddLiveChatTickerItemAction(TypedDict):
    item: AddLiveChatTickerItemActionItem


class ChoicesItem(TypedDict):
    text: Runs
    selected: bool
    voteRatio: float
    votePercentage: SimpleText
    signinEndpoint: Any


class PollHeaderRenderer(TypedDict):
    pollQuestion: Runs
    thumbnail: Thumbnails
    metadataText: Runs
    liveChatPollType: Literal["LIVE_CHAT_POLL_TYPE_CREATOR"]
    contextMenuButton: Any


class PollRendererHeader(TypedDict):
    pollHeaderRenderer: PollHeaderRenderer


class PollRenderer(TypedDict):
    choices: list[ChoicesItem]
    liveChatPollId: str
    header: PollRendererHeader


class PollToUpdate(TypedDict):
    pollRenderer: PollRenderer


class UpdateLiveChatPollAction(TypedDict):
    pollToUpdate: PollToUpdate


class ChatActionsItem(ClickTrackingParams):
    addChatItemAction: NotRequired[AddChatItemAction]
    removeChatItemByAuthorAction: NotRequired[dict]
    markChatItemAsDeletedAction: NotRequired[MarkChatItemAsDeletedAction]
    addLiveChatTickerItemAction: NotRequired[AddLiveChatTickerItemAction]
    updateLiveChatPollAction: NotRequired[UpdateLiveChatPollAction]


type ChatActions = list[ChatActionsItem]

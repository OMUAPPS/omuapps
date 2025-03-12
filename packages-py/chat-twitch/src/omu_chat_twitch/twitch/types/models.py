from __future__ import annotations

from typing import Literal, LiteralString, NotRequired, TypedDict

type TODO = None


class TwitchType[T: LiteralString](TypedDict):
    __typename: T


class UserRoles(TwitchType[Literal["UserRoles"]]):
    # {
    #     "isPartner": false,
    #     "isParticipatingDJ": false,
    #     "__typename": "UserRoles"
    # }
    isPartner: bool
    isParticipatingDJ: bool


class Team(TwitchType[Literal["Team"]]):
    # "primaryTeam": {
    #     "id": "6358",
    #     "name": "livecoders",
    #     "displayName": "Live Coders",
    #     "__typename": "Team"
    # }
    id: str
    name: str
    displayName: str


class ChannelModerationSettings(TwitchType[Literal["ChannelModerationSettings"]]):
    # {
    #     "canAccessViewerCardModLogs": null,
    #     "__typename": "ChannelModerationSettings",
    # }
    canAccessViewerCardModLogs: TODO


class Channel(TwitchType[Literal["Channel"]]):
    # "channel": {
    #     "id": "194196775",
    #     "__typename": "Channel"
    # }
    # {
    #     "id": "151368796",
    #     "moderationSettings": {"canAccessViewerCardModLogs": null, "__typename": "ChannelModerationSettings"},
    #     "__typename": "Channel",
    # }
    id: str
    moderationSettings: NotRequired[ChannelModerationSettings]


class Broadcast(TwitchType[Literal["Broadcast"]]):
    # "lastBroadcast": {
    #     "id": "318386659709",
    #     "title": "[6502 ASM] More NES Tetris Clone Stuff",
    #     "__typename": "Broadcast"
    # }
    id: str
    title: str


class Game(TwitchType[Literal["Game"]]):
    # "game": {
    #     "id": "1469308723",
    #     "slug": "software-and-game-development",
    #     "name": "Software and Game Development",
    #     "__typename": "Game"
    # }
    id: str
    slug: str
    name: str


class Stream(TwitchType[Literal["Stream"]]):
    # "stream": {
    #     "id": "318386659709",
    #     "type": "live",
    #     "createdAt": "2025-03-08T00:08:26Z",
    #     "game": Game,
    #     "__typename": "Stream"
    # }
    id: str
    type: str
    createdAt: str
    game: Game


class User(TwitchType[Literal["User"]]):
    id: str


class StreamMetadataUser(User):
    # "user": {
    #     "id": "194196775",
    #     "primaryColorHex": "41BA83",
    #     "roles": UserRoles,
    #     "profileImageURL": "https://static-cdn.jtvnw.net/jtv_user_pictures/2c2c2bd2-fa77-422e-bc36-d199f2f5ce12-profile_image-70x70.png",
    #     "primaryTeam": Team,
    #     "channel": Channel,
    #     "lastBroadcast": Broadcast,
    #     "stream": Stream,
    #     "__typename": "User"
    # }
    primaryColorHex: str
    roles: UserRoles
    profileImageURL: str
    primaryTeam: Team
    channel: Channel
    lastBroadcast: Broadcast
    stream: Stream


class ChannelUser(User):
    # {
    #     "id": "151368796",
    #     "login": "piratesoftware",
    #     "displayName": "PirateSoftware",
    #     "subscriptionProducts": list[SubscriptionProduct],
    #     "self": null,
    #     "__typename": "User",
    # }
    login: str
    displayName: str
    subscriptionProducts: list[SubscriptionProduct]
    self: TODO


class TargetUser(User):
    login: str
    bannerImageURL: str | None
    displayName: str
    displayBadges: list[Badge]
    profileImageURL: str
    createdAt: str
    relationship: TODO


class Authorization(TypedDict):
    isForbidden: bool
    forbiddenReasonCode: Literal["NONE"]


class PlaybackAccessToken(TwitchType[Literal["PlaybackAccessToken"]]):
    # "streamPlaybackAccessToken": {
    #     "value": "{\"adblock\":false,\"authorization\":{\"forbidden\":false,\"reason\":\"\"},\"blackout_enabled\":false,\"channel\":\"a230am\",\"channel_id\":824516405,\"chansub\":{\"restricted_bitrates\":[],\"view_until\":1924905600},\"ci_gb\":false,\"geoblock_reason\":\"\",\"device_id\":\"gORMN40xoIJdAKBPWD895cExxkDMcjus\",\"expires\":1741402097,\"extended_history_allowed\":false,\"game\":\"\",\"hide_ads\":false,\"https_required\":true,\"mature\":false,\"partner\":false,\"platform\":\"web\",\"player_type\":\"site\",\"private\":{\"allowed_to_view\":true},\"privileged\":false,\"role\":\"\",\"server_ads\":true,\"show_ads\":true,\"subscriber\":false,\"turbo\":false,\"user_id\":null,\"user_ip\":\"120.75.104.61\",\"version\":2}",
    #     "signature": "f7225b9ed26f215223335d83cf6e812c7d245a95",
    #     "authorization": {
    #         "isForbidden": false,
    #         "forbiddenReasonCode": "NONE"
    #     },
    #     "__typename": "PlaybackAccessToken"
    # }
    value: str
    signature: str
    authorization: Authorization


# {
#     adblock: false,
#     authorization: {forbidden: false, reason: ""},
#     blackout_enabled: false,
#     channel: "piratesoftware",
#     channel_id: 151368796,
#     chansub: {restricted_bitrates: [], view_until: 1924905600},
#     ci_gb: false,
#     geoblock_reason: "",
#     device_id: "B0ZhLGvAd6EGka9Zd9IwiKI7JRFuVyvk",
#     expires: 1741532296,
#     extended_history_allowed: false,
#     game: "",
#     hide_ads: false,
#     https_required: true,
#     mature: false,
#     partner: false,
#     platform: "web",
#     player_type: "site",
#     private: {allowed_to_view: true},
#     privileged: false,
#     role: "",
#     server_ads: true,
#     show_ads: true,
#     subscriber: false,
#     turbo: false,
#     user_id: null,
#     user_ip: "120.75.104.61",
#     version: 2,
# }
class ValueAuthorization(TypedDict):
    forbidden: bool
    reason: str


class Chansub(TypedDict):
    restricted_bitrates: list
    view_until: int


class Private(TypedDict):
    allowed_to_view: bool


class PlaybackAccessTokenValue(TypedDict):
    adblock: bool
    authorization: ValueAuthorization
    blackout_enabled: bool
    channel: str
    channel_id: int
    chansub: Chansub
    ci_gb: bool
    geoblock_reason: str
    device_id: str
    expires: int
    extended_history_allowed: bool
    game: str
    hide_ads: bool
    https_required: bool
    mature: bool
    partner: bool
    platform: str
    player_type: str
    private: Private
    privileged: bool
    role: str
    server_ads: bool
    show_ads: bool
    subscriber: bool
    turbo: bool
    user_id: None
    user_ip: str
    version: int


class Badge(TwitchType[Literal["Badge"]]):
    # {
    #     "id": "c3VwZXJ1bHRyYWNvbWJvLTIwMjM7MTs=",
    #     "setID": "superultracombo-2023",
    #     "version": "1",
    #     "title": "SuperUltraCombo 2023",
    #     "image1x": "https://static-cdn.jtvnw.net/badges/v1/5864739a-5e58-4623-9450-a2c0555ef90b/1",
    #     "image2x": "https://static-cdn.jtvnw.net/badges/v1/5864739a-5e58-4623-9450-a2c0555ef90b/2",
    #     "image4x": "https://static-cdn.jtvnw.net/badges/v1/5864739a-5e58-4623-9450-a2c0555ef90b/3",
    #     "clickAction": null,
    #     "clickURL": null,
    #     "__typename": "Badge",
    #     "description": "このユーザーはTwitchのSuperUltraCombo 2023に参加しました",
    # }
    id: str
    setID: str
    version: str
    title: str
    image1x: str
    image2x: str
    image4x: str
    clickAction: TODO
    clickURL: TODO
    description: str


class ChannelViewer(TwitchType[Literal["ChannelViewer"]]):
    # {
    #     "id": "99537430:151368796",
    #     "earnedBadges": list[Badge],
    #     "__typename": "ChannelViewer",
    # }
    id: str
    earnedBadges: NotRequired[list[Badge]]


class Emote(TwitchType[Literal["Emote"]]):
    # {
    #     "id": "emotesv2_9a8699aa46ee4d928c901f0dd9fd51ce",
    #     "setID": "312073689",
    #     "token": "yarrHey",
    #     "assetType": "ANIMATED",
    #     "__typename": "Emote",
    # }
    id: str
    setID: str
    token: str
    assetType: Literal["ANIMATED", "STATIC"]


class SubscriptionInterval(TwitchType[Literal["SubscriptionInterval"]]):
    # {
    #     "unit": "MONTH",
    #     "__typename": "SubscriptionInterval"
    # }
    unit: Literal["MONTH"]


class OfferEligibility(TwitchType[Literal["OfferEligibility"]]):
    # "eligibility": {
    #     "benefitsStartAt": null,
    #     "isEligible": false,
    #     "__typename": "OfferEligibility",
    # },
    benefitsStartAt: TODO
    isEligible: bool


class OfferTagBinding(TwitchType[Literal["OfferTagBinding"]]):
    # {
    #     "key": "channel_id",
    #     "value": "151368796",
    #     "__typename": "OfferTagBinding",
    # },
    key: str
    value: str


class PriceInfo(TwitchType[Literal["PriceInfo"]]):
    # {
    #     "id": "df8fa0fb-a491-468b-a0f4-e50c6c6f74c5",
    #     "currency": "JPY",
    #     "exponent": 0,
    #     "price": 700,
    #     "total": 700,
    #     "discount": null,
    #     "__typename": "PriceInfo",
    # }
    id: str
    currency: str
    exponent: int
    price: int
    total: int
    discount: TODO


class ChargeModelPlanInterval(TwitchType[Literal["ChargeModelPlanInterval"]]):
    # {
    #     "duration": 1,
    #     "unit": "MONTHS",
    #     "__typename": "ChargeModelPlanInterval",
    # }
    duration: int
    unit: Literal["MONTHS"]


class ChargeModelPlan(TwitchType[Literal["ChargeModelPlan"]]):
    # {
    #     "interval": ChargeModelPlanInterval,
    #     "renewalPolicy": "NO_RENEW",
    #     "__typename": "ChargeModelPlan",
    # }
    interval: ChargeModelPlanInterval
    renewalPolicy: Literal["NO_RENEW"]


class InternalChargeModel(TwitchType[Literal["InternalChargeModel"]]):
    # {
    #     "previewPrice": PriceInfo,
    #     "plan": ChargeModelPlan,
    #     "__typename": "InternalChargeModel",
    # }
    previewPrice: PriceInfo
    plan: ChargeModelPlan


class ChargeModel(TwitchType[Literal["ChargeModel"]]):
    # {
    #     "internal": InternalChargeModel,
    #     "__typename": "ChargeModel",
    # }
    internal: InternalChargeModel


class OfferListing(TwitchType[Literal["OfferListing"]]):
    # {
    #     "chargeModel": ChargeModel,
    #     "__typename": "OfferListing",
    # }
    chargeModel: ChargeModel


class Range(TwitchType[Literal["Range"]]):
    # {
    #     "min": 1,
    #     "max": 1,
    #     "__typename": "Range",
    # }
    min: int
    max: int


class Offer(TwitchType[Literal["Offer"]]):
    # {
    #     "id": "amzn1.twitch.commerce.offer.3dff3990-b960-432b-b205-fa7c843c177e",
    #     "tplr": "channel_sub_standard_gift",
    #     "platform": "WEB",
    #     "eligibility": OfferEligibility,
    #     "tagBindings": list[OfferTagBinding],
    #     "giftType": "SINGLE_RECIPIENT",
    #     "listing": OfferListing,
    #     "promotion": null,
    #     "quantity": Range,
    #     "__typename": "Offer",
    # }
    id: str
    tplr: str
    platform: str
    eligibility: OfferEligibility
    tagBindings: list[OfferTagBinding]
    giftType: Literal["SINGLE_RECIPIENT"]
    listing: OfferListing
    promotion: TODO
    quantity: Range


class SubscriptionStandardGifting(TwitchType[Literal["SubscriptionStandardGifting"]]):
    # {
    #     "offer": Offer,
    #     "__typename": "SubscriptionStandardGifting",
    # }
    offer: Offer


class SubscriptionGifting(TwitchType[Literal["SubscriptionGifting"]]):
    # {
    #     "standard": SubscriptionStandardGifting,
    #     "__typename": "SubscriptionGifting",
    #     "community": null,
    # }
    standard: SubscriptionStandardGifting
    community: TODO


class EmoteModifier(TwitchType[Literal["EmoteModifier"]]):
    # {
    #     "code": "HF",
    #     "name": "HORIZONTAL_FLIP",
    #     "__typename": "EmoteModifier",
    # }
    code: str
    name: str


class SubscriptionProduct(TwitchType[Literal["SubscriptionProduct"]]):
    # {
    #     "id": "343050",
    #     "price": "$5.99",
    #     "url": "https://www.twitch.tv/products/gopiratesoftware",
    #     "emoteSetID": "348822",
    #     "displayName": "Download A Pirate",
    #     "name": "gopiratesoftware",
    #     "tier": "1000",
    #     "type": "CHANSUB",
    #     "hasAdFree": true,
    #     "emotes": list[Emote],
    #     "emoteModifiers": [],
    #     "interval": {"unit": "MONTH", "__typename": "SubscriptionInterval"},
    #     "self": null,
    #     "offers": null,
    #     "gifting": SubscriptionGifting,
    #     "__typename": "SubscriptionProduct",
    # }
    id: str
    price: str
    url: str
    emoteSetID: str
    displayName: str
    name: str
    tier: str
    type: Literal["CHANSUB"]
    hasAdFree: bool
    emotes: list[Emote]
    emoteModifiers: list[EmoteModifier]
    interval: SubscriptionInterval
    self: TODO
    offers: TODO
    gifting: SubscriptionGifting


class RequestInfo(TwitchType[Literal["RequestInfo"]]):
    # {
    #     "countryCode": "JP",
    #     "__typename": "RequestInfo",
    # }
    countryCode: str

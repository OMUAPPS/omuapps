from typing import Literal, LiteralString, NotRequired, TypedDict


class Payload[Cmd: LiteralString](TypedDict):
    cmd: Cmd


class Nonce(TypedDict):
    nonce: str


class NullNonce(TypedDict):
    nonce: str


class Event[Evt: LiteralString](TypedDict):
    evt: Evt


class NullEvent(TypedDict):
    evt: Literal[None]


class Data[Data](TypedDict):
    data: Data


class Args[Args](TypedDict):
    args: Args


class DispatchPayload[Evt: LiteralString](Payload[Literal["DISPATCH"]], Event[Evt]): ...


class SubscribeRequestPayload[Evt: LiteralString](
    Payload[Literal["SUBSCRIBE"]],
    Event[Evt],
    Nonce,
): ...


class SubscribeResponseData(TypedDict):
    evt: str


class SubscribeResponsePayload(
    Payload[Literal["SUBSCRIBE"]],
    NullEvent,
    Data[SubscribeResponseData],
    Nonce,
): ...


class ServerConfiguration(TypedDict):
    cdn_host: str
    api_endpoint: str
    environment: Literal["production", "development"]


class ReadyData(TypedDict):
    v: int
    config: ServerConfiguration


class ReadyPayload(
    DispatchPayload[Literal["READY"]],
    Data[ReadyData],
    NullNonce,
): ...


type Scope = Literal[
    "identify",
    "email",
    "connections",
    "guilds",
    "guilds.join",
    "guilds.members.read",
    "guilds.channels.read",
    "gdm.join",
    "bot",
    "rpc",
    "rpc.notifications.read",
    "rpc.voice.read",
    "rpc.voice.write",
    "rpc.video.read",
    "rpc.video.write",
    "rpc.screenshare.read",
    "rpc.screenshare.write",
    "rpc.activities.write",
    "webhook.incoming",
    "messages.read",
    "applications.builds.upload",
    "applications.builds.read",
    "applications.commands",
    "applications.store.update",
    "applications.entitlements",
    "activities.read",
    "activities.write",
    "relationships.read",
    "relationships.write",
    "voice",
    "dm_channels.read",
    "role_connections.write",
    "presences.read",
    "presences.write",
    "openid",
    "dm_channels.messages.read",
    "dm_channels.messages.write",
    "gateway.connect",
    "account.global_name.update",
    "payment_sources.country_code",
    "sdk.social_layer",
    "applications.commands.permissions.update",
]


class AuthorizeRequestArgs(TypedDict):
    client_id: str
    scopes: list[Scope]
    prompt: Literal["none"]


class AuthorizeRequestPayload(
    Payload[Literal["AUTHORIZE"]],
    Args[AuthorizeRequestArgs],
    Nonce,
): ...


class AuthorizeResponseData(TypedDict):
    code: str


class AuthorizeResponsePayload(
    Payload[Literal["AUTHORIZE"]],
    NullEvent,
    Data[AuthorizeResponseData],
    Nonce,
): ...


class AuthenticateRequestArgs(TypedDict):
    access_token: str


class AuthenticateRequestPayload(
    Payload[Literal["AUTHENTICATE"]],
    Args[AuthenticateRequestArgs],
    Nonce,
): ...


class Application(TypedDict):
    id: str
    name: str
    icon: str
    description: str
    type: None
    summary: str
    is_monetized: bool
    is_verified: bool
    rpc_origins: list[str]
    integration_types_config: dict[str, dict[str, str]]
    verify_key: str
    flags: int
    hook: bool
    storefront_available: bool


class User(TypedDict):
    id: str
    username: str
    discriminator: str
    avatar: str | None
    avatar_decoration_data: None
    flags: int
    global_name: str


class AuthenticateUser(User):
    public_flags: int
    banner: None
    accent_color: int
    banner_color: str
    clan: None


class AuthenticateResponseData(TypedDict):
    application: Application
    expires: str
    scopes: list[Scope]
    user: AuthenticateUser
    access_token: str


class AuthenticateResponsePayload(
    Payload[Literal["AUTHENTICATE"]],
    NullEvent,
    Data[AuthenticateResponseData],
    Nonce,
): ...


class GetGuildsRequestArgs(TypedDict):
    pass


class GetGuildsRequestPayload(
    Payload[Literal["GET_GUILDS"]],
    Args[GetGuildsRequestArgs],
    Nonce,
): ...


class Guild(TypedDict):
    id: str
    name: str
    icon_url: NotRequired[str]


class GetGuildsResponseData(TypedDict):
    guilds: list[Guild]


class GetGuildsResponsePayload(
    Payload[Literal["GET_GUILDS"]],
    NullEvent,
    Data[GetGuildsResponseData],
    Nonce,
): ...


class GetChannelsRequestArgs(TypedDict):
    guild_id: str


class GetChannelsRequestPayload(
    Payload[Literal["GET_CHANNELS"]],
    Args[GetChannelsRequestArgs],
    Nonce,
): ...


class Channel(TypedDict):
    id: str
    name: str
    type: int


class GetChannelsResponseData(TypedDict):
    channels: list[Channel]


class GetChannelsResponsePayload(
    Payload[Literal["GET_CHANNELS"]],
    NullEvent,
    Data[GetChannelsResponseData],
    Nonce,
): ...


class GetSelectedVoiceChannelArgs(TypedDict): ...


class GetSelectedVoiceChannelPayload(
    Payload[Literal["GET_SELECTED_VOICE_CHANNEL"]],
    Args[GetSelectedVoiceChannelArgs],
    Nonce,
): ...


class VoiceStateSubscriptionArgs(TypedDict):
    channel_id: str


class VoiceStateCreateSubscriptionPayload(
    SubscribeRequestPayload[Literal["VOICE_STATE_CREATE"]],
    Args[VoiceStateSubscriptionArgs],
    Nonce,
): ...


class VoiceStateUpdateSubscriptionPayload(
    SubscribeRequestPayload[Literal["VOICE_STATE_UPDATE"]],
    Args[VoiceStateSubscriptionArgs],
    Nonce,
): ...


class VoiceStateDeleteSubscriptionPayload(
    SubscribeRequestPayload[Literal["VOICE_STATE_DELETE"]],
    Args[VoiceStateSubscriptionArgs],
    Nonce,
): ...


class Pan(TypedDict):
    left: float
    right: float


class VoiceState(TypedDict):
    mute: bool
    deaf: bool
    self_mute: bool
    self_deaf: bool
    suppress: bool


class VoiceStateUser(User):
    bot: bool
    premium_type: int


class VoiceStateItem(TypedDict):
    nick: str
    mute: bool
    volume: float
    pan: Pan
    voice_state: VoiceState
    user: VoiceStateUser


class VoiceStateCreateDispatchPayload(
    DispatchPayload[Literal["VOICE_STATE_CREATE"]],
    Data[VoiceStateItem],
    NullNonce,
): ...


class VoiceStateUpdateDispatchPayload(
    DispatchPayload[Literal["VOICE_STATE_UPDATE"]],
    Data[VoiceStateItem],
    NullNonce,
): ...


class VoiceStateDeleteDispatchPayload(
    DispatchPayload[Literal["VOICE_STATE_DELETE"]],
    Data[VoiceStateItem],
    NullNonce,
): ...


class VoiceChannelSelect(TypedDict):
    channel_id: str | None
    guild_id: NotRequired[str]


class VoiceChannelSelectDispatchPayload(
    DispatchPayload[Literal["VOICE_CHANNEL_SELECT"]],
    Data[VoiceChannelSelect],
    NullNonce,
): ...


class GetChannelArgs(TypedDict):
    channel_id: str


class GetChannelRequestPayload(
    Payload[Literal["GET_CHANNEL"]],
    Args[GetChannelArgs],
    Nonce,
): ...


class GetGuildRequestArgs(TypedDict):
    guild_id: str
    timeout: int


class GetGuildRequestPayload(
    Payload[Literal["GET_GUILD"]],
    Args[GetGuildRequestArgs],
    Nonce,
): ...


class Author(User):
    banner: None
    email: str | None
    verified: bool
    bot: bool
    system: bool
    mfaEnabled: bool
    mobile: bool
    desktop: bool
    flags: int
    publicFlags: int
    purchasedFlags: int
    premiumUsageFlags: int
    phone: str | None
    nsfwAllowed: NotRequired[bool]
    guildMemberAvatars: dict
    hasBouncedEmail: bool
    personalConnectionId: None
    globalName: str | None
    clan: None


class Message(TypedDict):
    id: str
    blocked: bool
    bot: bool
    content: str
    nick: str
    edited_timestamp: None
    timestamp: str
    tts: bool
    mentions: list
    mention_everyone: bool
    mention_roles: list
    embeds: list
    attachments: list
    author: Author
    pinned: bool
    type: int


class GetChannelResponseData(TypedDict):
    id: str
    name: str
    type: int
    topic: str
    bitrate: int
    user_limit: int
    guild_id: str | None
    position: int
    messages: list[Message]
    voice_states: list[VoiceStateItem]


class GetChannelResponsePayload(
    Payload[Literal["GET_CHANNEL"]],
    NullEvent,
    Data[GetChannelResponseData],
    Nonce,
): ...


class GetGuildResponseData(TypedDict):
    id: str
    name: str
    icon_url: str | None
    members: tuple[
        ()
    ]  # deprecated; always empty array. see https://discord.com/developers/docs/topics/rpc#getguild-get-guild-response-structure
    vanity_url_code: str | None


class GetGuildResponsePayload(
    Payload[Literal["GET_GUILD"]],
    NullEvent,
    Data[GetGuildResponseData],
    Nonce,
): ...


class GetSelectedVoiceChannelResponsePayload(
    Payload[Literal["GET_SELECTED_VOICE_CHANNEL"]],
    NullEvent,
    Data[GetChannelResponseData],
    Nonce,
): ...


class SpeakingStartSubscriptionArgs(TypedDict):
    channel_id: str


class SpeakingStartSubscriptionPayload(
    SubscribeRequestPayload[Literal["SPEAKING_START"]],
    Args[SpeakingStartSubscriptionArgs],
    Nonce,
): ...


class SpeakingStopSubscriptionArgs(TypedDict):
    channel_id: str


class SpeakingStopSubscriptionPayload(
    SubscribeRequestPayload[Literal["SPEAKING_STOP"]],
    Args[SpeakingStopSubscriptionArgs],
    Nonce,
): ...


class VoiceChannelSelectSubscriptionArgs(TypedDict):
    channel_id: str | None
    guild_id: str | None


class VoiceChannelSelectSubscriptionPayload(
    SubscribeRequestPayload[Literal["VOICE_CHANNEL_SELECT"]],
    Args[VoiceChannelSelectSubscriptionArgs],
    Nonce,
): ...


class SpeakingStartData(TypedDict):
    channel_id: str
    user_id: str


class SpeakingStartDispatchPayload(
    DispatchPayload[Literal["SPEAKING_START"]],
    Data[SpeakingStartData],
    NullNonce,
): ...


class SpeakingStopData(TypedDict):
    channel_id: str
    user_id: str


class SpeakingStopDispatchPayload(
    DispatchPayload[Literal["SPEAKING_STOP"]],
    Data[SpeakingStopData],
    NullNonce,
): ...


class UnsubscribeRequestPayload[Evt: LiteralString](
    Payload[Literal["UNSUBSCRIBE"]],
    Event[Evt],
    Nonce,
): ...


type SubscribePayloads = (
    SubscribeRequestPayload
    | VoiceStateCreateSubscriptionPayload
    | VoiceStateUpdateSubscriptionPayload
    | VoiceStateDeleteSubscriptionPayload
    | SpeakingStartSubscriptionPayload
    | SpeakingStopSubscriptionPayload
    | VoiceChannelSelectSubscriptionPayload
)
type RequestPayloads = (
    SubscribePayloads
    | AuthorizeRequestPayload
    | AuthenticateRequestPayload
    | GetGuildsRequestPayload
    | GetChannelsRequestPayload
    | GetChannelRequestPayload
    | GetGuildRequestPayload
    | GetSelectedVoiceChannelPayload
    | UnsubscribeRequestPayload[Literal["VOICE_STATE_CREATE"]]
    | UnsubscribeRequestPayload[Literal["VOICE_STATE_UPDATE"]]
    | UnsubscribeRequestPayload[Literal["VOICE_STATE_DELETE"]]
    | UnsubscribeRequestPayload[Literal["SPEAKING_START"]]
    | UnsubscribeRequestPayload[Literal["SPEAKING_STOP"]]
    | UnsubscribeRequestPayload[Literal["VOICE_CHANNEL_SELECT"]]
)
type ResponsePayloads = (
    SubscribeResponsePayload
    | ReadyPayload
    | AuthorizeResponsePayload
    | AuthenticateResponsePayload
    | GetGuildsResponsePayload
    | GetChannelsResponsePayload
    | GetSelectedVoiceChannelResponsePayload
    | VoiceStateCreateDispatchPayload
    | VoiceStateUpdateDispatchPayload
    | VoiceStateDeleteDispatchPayload
    | VoiceChannelSelectDispatchPayload
    | SpeakingStartDispatchPayload
    | SpeakingStopDispatchPayload
    | GetChannelResponsePayload
    | GetGuildResponsePayload
)

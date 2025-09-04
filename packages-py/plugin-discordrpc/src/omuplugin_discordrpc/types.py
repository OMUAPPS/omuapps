from typing import TypedDict

from omu.api.endpoint import EndpointType
from omu.api.registry import RegistryPermissions, RegistryType

from .const import PLUGIN_ID
from .discordrpc.payloads import (
    AuthenticateUser,
    GetChannelResponseData,
    GetChannelsResponseData,
    GetGuildResponseData,
    GetGuildsResponseData,
    VoiceStateItem,
)
from .permissions import (
    DISCORDRPC_CHANNELS_READ_PERMISSION_ID,
    DISCORDRPC_VC_READ_PERMISSION_ID,
    DISCORDRPC_VC_SET_PERMISSION_ID,
)

VOICE_STATE_REGISTRY_TYPE = RegistryType[dict[str, VoiceStateItem]].create_json(
    PLUGIN_ID,
    "voice_states",
    default_value={},
    permissions=RegistryPermissions(read=DISCORDRPC_VC_READ_PERMISSION_ID),
)


class SpeakState(TypedDict):
    speaking: bool
    speaking_start: int
    speaking_stop: int


SPEAKING_STATE_REGISTRY_TYPE = RegistryType[dict[str, SpeakState]].create_json(
    PLUGIN_ID,
    "speaking_states",
    default_value={},
    permissions=RegistryPermissions(read=DISCORDRPC_VC_READ_PERMISSION_ID),
)


class SelectedVoiceChannel(TypedDict):
    guild: GetGuildResponseData | None
    channel: GetChannelResponseData


SELECTED_VOICE_CHANNEL_REGISTRY_TYPE = RegistryType[SelectedVoiceChannel | None].create_json(
    PLUGIN_ID,
    "selected_voice_channel",
    default_value=None,
    permissions=RegistryPermissions(read=DISCORDRPC_VC_READ_PERMISSION_ID),
)


class SessionData(TypedDict):
    access_token: str


class SessionRegistry(TypedDict):
    sessions: dict[str, SessionData]
    user_id: str | None
    guild_id: str | None
    channel_id: str | None


SESSION_REGISTRY_TYPE = RegistryType[SessionRegistry].create_json(
    PLUGIN_ID,
    "sessions,",
    default_value={
        "sessions": {},
        "user_id": None,
        "guild_id": None,
        "channel_id": None,
    },
)


GET_CLIENTS_ENDPOINT_TYPE = EndpointType[None, dict[str, AuthenticateUser]].create_json(
    PLUGIN_ID,
    "get_clients",
    permission_id=DISCORDRPC_CHANNELS_READ_PERMISSION_ID,
)


class GetGuildsRequest(TypedDict):
    user_id: str


GET_GUILDS_ENDPOINT_TYPE = EndpointType[GetGuildsRequest, GetGuildsResponseData].create_json(
    PLUGIN_ID,
    "get_guilds",
    permission_id=DISCORDRPC_CHANNELS_READ_PERMISSION_ID,
)


class GetChannelsRequest(TypedDict):
    user_id: str
    guild_id: str


GET_CHANNELS_ENDPOINT_TYPE = EndpointType[GetChannelsRequest, GetChannelsResponseData].create_json(
    PLUGIN_ID,
    "get_channels",
    permission_id=DISCORDRPC_CHANNELS_READ_PERMISSION_ID,
)


class SetVCRequest(TypedDict):
    user_id: str
    guild_id: str | None
    channel_id: str | None


SET_VC_ENDPOINT_TYPE = EndpointType[SetVCRequest, None].create_json(
    PLUGIN_ID,
    "set_vc",
    permission_id=DISCORDRPC_VC_SET_PERMISSION_ID,
)

WAIT_FOR_READY_ENDPOINT_TYPE = EndpointType[None, None].create_json(
    PLUGIN_ID,
    "wait_for_ready",
    permission_id=DISCORDRPC_VC_READ_PERMISSION_ID,
)

REFRESH_ENDPOINT_TYPE = EndpointType[None, None].create_json(
    PLUGIN_ID,
    "refresh",
    permission_id=DISCORDRPC_VC_READ_PERMISSION_ID,
)

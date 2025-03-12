from typing import Literal, TypedDict

from ..gql import GQLOperation
from .models import PlaybackAccessToken

# {
#     "operationName": "PlaybackAccessToken_Template",
#     "query": 'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!, $platform: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: $platform, playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isLive) {    value    signature   authorization { isForbidden forbiddenReasonCode }   __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: $platform, playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isVod) {    value    signature   __typename  }}',
#     "variables": {
#         "isLive": true,
#         "login": "a230am",
#         "isVod": false,
#         "vodID": "",
#         "playerType": "site",
#         "platform": "web",
#     },
# }

PLAYBACK_ACCESS_TOKEN_QUERY = 'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!, $platform: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature   authorization { isForbidden forbiddenReasonCode }   __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: $platform, playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature   __typename  }}'


class PlaybackAccessTokenTemplateVariables(TypedDict):
    isLive: bool
    login: str
    isVod: bool
    vodID: str
    platform: Literal["web"]
    playerType: Literal["site"]


# {
#     "data": {
#         "streamPlaybackAccessToken": {
#             "value": "{\"adblock\":false,\"authorization\":{\"forbidden\":false,\"reason\":\"\"},\"blackout_enabled\":false,\"channel\":\"a230am\",\"channel_id\":824516405,\"chansub\":{\"restricted_bitrates\":[],\"view_until\":1924905600},\"ci_gb\":false,\"geoblock_reason\":\"\",\"device_id\":\"gORMN40xoIJdAKBPWD895cExxkDMcjus\",\"expires\":1741402097,\"extended_history_allowed\":false,\"game\":\"\",\"hide_ads\":false,\"https_required\":true,\"mature\":false,\"partner\":false,\"platform\":\"web\",\"player_type\":\"site\",\"private\":{\"allowed_to_view\":true},\"privileged\":false,\"role\":\"\",\"server_ads\":true,\"show_ads\":true,\"subscriber\":false,\"turbo\":false,\"user_id\":null,\"user_ip\":\"120.75.104.61\",\"version\":2}",
#             "signature": "f7225b9ed26f215223335d83cf6e812c7d245a95",
#             "authorization": {
#                 "isForbidden": false,
#                 "forbiddenReasonCode": "NONE"
#             },
#             "__typename": "PlaybackAccessToken"
#         }
#     },
#     "extensions": {
#         "durationMilliseconds": 60,
#         "operationName": "PlaybackAccessToken_Template",
#         "requestID": "01JNSS9XGW0N70BF0J9TXTD6SD"
#     }
# }


class PlaybackAccessTokenTemplateResponse(TypedDict):
    streamPlaybackAccessToken: PlaybackAccessToken


PlaybackAccessTokenTemplate = GQLOperation[
    Literal["PlaybackAccessToken_Template"],
    PlaybackAccessTokenTemplateVariables,
    PlaybackAccessTokenTemplateResponse,
]("PlaybackAccessToken_Template")

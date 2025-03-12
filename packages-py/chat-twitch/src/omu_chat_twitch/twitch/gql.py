from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, LiteralString, NotRequired, TypedDict

if TYPE_CHECKING:
    from .api import TwitchAPI


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
class Extensions[T: LiteralString](TypedDict):
    durationMilliseconds: int
    operationName: T
    requestID: str


class Error(TypedDict):
    # [{'message': 'no operations in query document'}]
    message: str


class GQLResponseError[T: LiteralString](TypedDict):
    errors: list[Error]
    extensions: Extensions[T]


class GQLResponseOk[D, T: LiteralString](TypedDict):
    data: D
    extensions: Extensions[T]


type GQLResponse[T: LiteralString, D] = GQLResponseOk[D, T] | GQLResponseError[T]


class GQLQuery[T: str, V](TypedDict):
    operationName: T
    query: NotRequired[str]
    variables: V


# @dataclass(frozen=True, slots=True)
@dataclass(frozen=True)
class GQLOperation[T: LiteralString, V, D]:
    operation_name: T

    async def query(
        self,
        api: TwitchAPI,
        variables: V | None = None,
        query: str | None = None,
    ) -> D:
        return await api.gql(
            operation_name=self.operation_name,
            query_data=query,
            variables=variables,
        )

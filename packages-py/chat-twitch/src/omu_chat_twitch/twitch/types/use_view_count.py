from typing import Literal, TypedDict

from ..gql import GQLOperation
from .query_variables import UseViewCountVariables


class Stream(TypedDict):
    id: str
    viewersCount: int
    collaborationViewersCount: int


class UseViewCountResponse(TypedDict):
    stream: Stream


UseViewCount = GQLOperation[
    Literal["UseViewCount"],
    UseViewCountVariables,
    UseViewCountResponse,
]("UseViewCount")

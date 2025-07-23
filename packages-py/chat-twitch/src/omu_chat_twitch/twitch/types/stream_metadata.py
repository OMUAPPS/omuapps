from typing import Literal, TypedDict

from ..gql import GQLOperation
from ..types.query_variables import StreamMetadataVariables
from .models import StreamMetadataUser


class StreamMetadataResponse(TypedDict):
    user: StreamMetadataUser


StreamMetadata = GQLOperation[
    Literal["StreamMetadata"],
    StreamMetadataVariables,
    StreamMetadataResponse,
]("StreamMetadata")

from typing import Literal, TypedDict

from ..gql import GQLOperation
from ..types.models import Channel, ChannelUser, ChannelViewer, RequestInfo, TargetUser, User
from ..types.query_variables import ViewerCardVariables


class ViewerCardResponse(TypedDict):
    # {
    #     "activeTargetUser": User,
    #     "targetUser": User,
    #     "channelUser": ChannelUser,
    #     "currentUser": None,
    #     "channelViewer": ChannelViewer,
    #     "channel": Channel,
    #     "requestInfo": RequestInfo,
    # }
    activeTargetUser: User
    targetUser: TargetUser
    channelUser: ChannelUser
    currentUser: None
    channelViewer: ChannelViewer
    channel: Channel
    requestInfo: RequestInfo


ViewerCard = GQLOperation[
    Literal["ViewerCard"],
    ViewerCardVariables,
    ViewerCardResponse,
]("ViewerCard")

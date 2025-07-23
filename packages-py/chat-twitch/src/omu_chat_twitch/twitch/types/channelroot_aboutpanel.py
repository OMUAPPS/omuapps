from typing import Literal, TypedDict

from omu_chat_twitch.twitch.types.query_variables import ChannelRoot_AboutPanelVariables

from ..gql import GQLOperation
from .models import ChannelAboutUser, User


class ChannelRoot_AboutPanelResponse(TypedDict):
    currentUser: User
    user: ChannelAboutUser


ChannelRoot_AboutPanel = GQLOperation[
    Literal["ChannelRoot_AboutPanel"],
    ChannelRoot_AboutPanelVariables,
    ChannelRoot_AboutPanelResponse,
]("ChannelRoot_AboutPanel")

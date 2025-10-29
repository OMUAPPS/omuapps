from typing import Any, TypedDict

from .contents import Contents
from .youtuberesponse import YoutubeResponse


class WatchEndpoint(TypedDict):
    videoId: str


class InnertubeCommand(TypedDict):
    clickTrackingParams: str
    commandMetadata: Any
    watchEndpoint: WatchEndpoint


class OnTap(TypedDict):
    innertubeCommand: InnertubeCommand


class CommandContext(TypedDict):
    onTap: OnTap


class RendererContext(TypedDict):
    loggingContext: Any
    accessibilityContext: Any
    commandContext: CommandContext


class DecoratedAvatarViewModel(TypedDict):
    avatar: Any
    liveData: Any
    rendererContext: RendererContext


class PageHeaderViewModelImage(TypedDict):
    decoratedAvatarViewModel: DecoratedAvatarViewModel


class PageHeaderViewModel(TypedDict):
    title: Any
    image: PageHeaderViewModelImage


class PageHeaderRendererContent(TypedDict):
    pageHeaderViewModel: PageHeaderViewModel


class PageHeaderRenderer(TypedDict):
    pageTitle: str
    content: PageHeaderRendererContent


class Header(TypedDict):
    pageHeaderRenderer: PageHeaderRenderer


class ytinitialdata(YoutubeResponse):
    contents: Contents
    header: Header

from typing import TypedDict

from .chatactions import ChatActions
from .tracking import ClickTrackingParams


class InvalidationId(TypedDict):
    objectSource: int
    objectId: str
    topic: str
    subscribeToGcmTopics: bool
    protoCreationTimestampMs: str


class ContinuationData(ClickTrackingParams):
    invalidationId: InvalidationId
    timeoutMs: int
    continuation: str


class ContinuationItem(TypedDict):
    invalidationContinuationData: ContinuationData
    timedContinuationData: ContinuationData


type Continuations = list[ContinuationItem]


class LiveChatRenderer(TypedDict):
    continuations: Continuations
    actions: ChatActions


class Contents(TypedDict):
    liveChatRenderer: LiveChatRenderer

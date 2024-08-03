from typing import Literal, LiteralString, NotRequired, TypedDict

from omu.extension.endpoint import EndpointType
from omu.extension.signal.signal import SignalType

from omuplugin_obssync.const import PLUGIN_ID

TEST_ENDPOINT_TYPE = EndpointType[None, str].create_json(
    PLUGIN_ID,
    name="test",
)


type OBSFrontendEvent = Literal[
    "STREAMING_STARTING",
    "STREAMING_STARTED",
    "STREAMING_STOPPING",
    "STREAMING_STOPPED",
    "RECORDING_STARTING",
    "RECORDING_STARTED",
    "RECORDING_STOPPING",
    "RECORDING_STOPPED",
    "SCENE_CHANGED",
    "SCENE_LIST_CHANGED",
    "TRANSITION_CHANGED",
    "TRANSITION_STOPPED",
    "TRANSITION_LIST_CHANGED",
    "SCENE_COLLECTION_CHANGED",
    "SCENE_COLLECTION_LIST_CHANGED",
    "PROFILE_CHANGED",
    "PROFILE_LIST_CHANGED",
    "EXIT",
    "REPLAY_BUFFER_STARTING",
    "REPLAY_BUFFER_STARTED",
    "REPLAY_BUFFER_STOPPING",
    "REPLAY_BUFFER_STOPPED",
    "STUDIO_MODE_ENABLED",
    "STUDIO_MODE_DISABLED",
    "PREVIEW_SCENE_CHANGED",
    "SCENE_COLLECTION_CLEANUP",
    "FINISHED_LOADING",
    "RECORDING_PAUSED",
    "RECORDING_UNPAUSED",
    "TRANSITION_DURATION_CHANGED",
    "REPLAY_BUFFER_SAVED",
    "VIRTUALCAM_STARTED",
    "VIRTUALCAM_STOPPED",
    "TBAR_VALUE_CHANGED",
    "SCENE_COLLECTION_CHANGING",
    "PROFILE_CHANGING",
    "SCRIPTING_SHUTDOWN",
    "PROFILE_RENAMED",
    "SCENE_COLLECTION_RENAMED",
    "THEME_CHANGED",
    "SCREENSHOT_TAKEN",
]


type OBSScaleType = Literal[
    "DISABLE",
    "POINT",
    "BICUBIC",
    "BILINEAR",
    "LANCZOS",
    "AREA",
]


class ScaleProperties(TypedDict):
    scale_filter: OBSScaleType


class ScalableSource(TypedDict):
    scale_properties: NotRequired[ScaleProperties]


type OBSBlendingMethod = Literal[
    "DEFAULT",
    "SRGB_OFF",
]
type OBSBlendingType = Literal[
    "NORMAL",
    "ADDITIVE",
    "SUBTRACT",
    "SCREEN",
    "MULTIPLY",
    "LIGHTEN",
    "DARKEN",
]


class BlendProperties(TypedDict):
    blending_method: OBSBlendingMethod
    blending_mode: OBSBlendingType


class BlendableSource(TypedDict):
    blend_properties: NotRequired[BlendProperties]


class SizeInfo(TypedDict):
    width: NotRequired[int]
    height: NotRequired[int]


class SourceType[T: LiteralString, D](TypedDict):
    type: T
    data: D
    name: str
    uuid: NotRequired[str]
    scene: NotRequired[str]


class BrowserSourceData(SizeInfo):
    url: NotRequired[str]
    fps_custom: NotRequired[bool]
    is_local_file: NotRequired[bool]
    local_file: NotRequired[str]
    reroute_audio: NotRequired[bool]
    fps: NotRequired[int]
    css: NotRequired[str]
    shutdown: NotRequired[bool]
    restart_when_active: NotRequired[bool]
    webpage_control_level: NotRequired[int]


class BrowserSource(
    SourceType[Literal["browser_source"], BrowserSourceData],
    BlendableSource,
    ScalableSource,
): ...


class TextSourceData(TypedDict):
    text: NotRequired[str]
    antialiasing: NotRequired[bool]
    read_from_file: NotRequired[bool]
    vertical: NotRequired[bool]
    gradient: NotRequired[bool]
    color: NotRequired[int]
    gradient_color: NotRequired[int]
    opacity: NotRequired[int]
    gradient_opacity: NotRequired[int]
    gradient_dir: NotRequired[float]
    bk_color: NotRequired[int]
    bk_opacity: NotRequired[int]
    align: NotRequired[Literal["left", "center", "right"]]
    valign: NotRequired[Literal["top", "center", "bottom"]]
    outline: NotRequired[bool]
    outline_size: NotRequired[int]
    outline_color: NotRequired[int]
    outline_opacity: NotRequired[int]
    chatlog: NotRequired[bool]
    extents: NotRequired[bool]
    chatlog_lines: NotRequired[int]
    extents_cx: NotRequired[int]
    extents_cy: NotRequired[int]
    extents_wrap: NotRequired[bool]


class TextSource(
    SourceType[Literal["text_gdiplus"], TextSourceData],
    BlendableSource,
    ScalableSource,
): ...


type SourceJson = BrowserSource | TextSource

browser: SourceJson = {
    "type": "browser_source",
    "name": "browser",
    "data": {
        "url": "https://www.google.com",
        "width": 1920,
        "height": 1080,
    },
}


class SceneJson(TypedDict):
    name: str
    sources: list[SourceJson]


class CreateResponse(TypedDict):
    source: SourceType


SOURCE_CREATE = EndpointType[SourceJson, CreateResponse].create_json(
    PLUGIN_ID,
    name="source_create",
)


class RemoveByNameRequest(TypedDict):
    name: str


class RemoveByUuidRequest(TypedDict):
    uuid: str


class RemoveResponse(TypedDict): ...


SOURCE_REMOVE_BY_NAME = EndpointType[RemoveByNameRequest, RemoveResponse].create_json(
    PLUGIN_ID,
    name="source_remove_by_name",
)


SOURCE_REMOVE_BY_UUID = EndpointType[RemoveByUuidRequest, RemoveResponse].create_json(
    PLUGIN_ID,
    name="source_remove_by_uuid",
)


class UpdateResponse(TypedDict):
    source: SourceType


SOURCE_UPDATE = EndpointType[SourceJson, UpdateResponse].create_json(
    PLUGIN_ID,
    name="source_update",
)


class SourceGetByNameRequest(TypedDict):
    scene: NotRequired[str]
    name: str


SOURCE_GET_BY_NAME = EndpointType[SourceGetByNameRequest, SourceJson].create_json(
    PLUGIN_ID,
    name="source_get_by_name",
)


class SourceGetByUuidRequest(TypedDict):
    scene: NotRequired[str]
    uuid: str


SOURCE_GET_BY_UUID = EndpointType[SourceGetByUuidRequest, SourceJson].create_json(
    PLUGIN_ID,
    name="source_get_by_uuid",
)


class SourceListRequest(TypedDict):
    scene: NotRequired[str]


SOURCE_LIST = EndpointType[SourceListRequest, list[SourceJson]].create_json(
    PLUGIN_ID,
    name="source_list",
)


class SceneListRequest(TypedDict): ...


class SceneListResponse(TypedDict):
    scenes: list[SceneJson]


SCENE_LIST = EndpointType[SceneListRequest, SceneListResponse].create_json(
    PLUGIN_ID,
    name="scene_list",
)


class SceneGetRequest(TypedDict):
    scene: NotRequired[str]


SCENE_GET = EndpointType[SceneGetRequest, SceneJson].create_json(
    PLUGIN_ID,
    name="scene_get",
)

EVENT_SIGNAL = SignalType[OBSFrontendEvent].create_json(
    PLUGIN_ID,
    name="event_signal",
)

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, LiteralString, NotRequired, TypedDict

from omu.bytebuffer import ByteReader, ByteWriter
from omu.extension.endpoint import EndpointType
from omu.extension.signal.signal import SignalType
from omu.serializer import Serializer

from omuplugin_obs.const import PLUGIN_ID

from .permissions import (
    OBS_SCENE_CREATE_PERMISSION_ID,
    OBS_SCENE_READ_PERMISSION_ID,
    OBS_SCENE_SET_CURRENT_PERMISSION_ID,
    OBS_SOURCE_CREATE_PERMISSION_ID,
    OBS_SOURCE_READ_PERMISSION_ID,
    OBS_SOURCE_UPDATE_PERMISSION_ID,
)

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
    uuid: str
    sources: list[SourceJson]


class CreateResponse(TypedDict):
    source: SourceJson


SOURCE_CREATE = EndpointType[SourceJson, CreateResponse].create_json(
    PLUGIN_ID,
    name="source_create",
    permission_id=OBS_SOURCE_CREATE_PERMISSION_ID,
)

SOURCE_ADD = EndpointType[SourceJson, CreateResponse].create_json(
    PLUGIN_ID,
    name="source_add",
    permission_id=OBS_SOURCE_CREATE_PERMISSION_ID,
)


class CreateBrowserRequest(BlendableSource, ScalableSource, TypedDict):
    name: str
    scene: NotRequired[str]
    url: str
    width: NotRequired[int | str]
    height: NotRequired[int | str]
    css: NotRequired[str]


BROWSER_CREATE = EndpointType[CreateBrowserRequest, CreateResponse].create_json(
    PLUGIN_ID,
    name="browser_create",
    permission_id=OBS_SOURCE_CREATE_PERMISSION_ID,
)

BROWSER_ADD = EndpointType[CreateBrowserRequest, CreateResponse].create_json(
    PLUGIN_ID,
    name="browser_add",
    permission_id=OBS_SOURCE_CREATE_PERMISSION_ID,
)


class RemoveByNameRequest(TypedDict):
    name: str


class RemoveByUuidRequest(TypedDict):
    uuid: str


class RemoveResponse(TypedDict): ...


SOURCE_REMOVE_BY_NAME = EndpointType[RemoveByNameRequest, RemoveResponse].create_json(
    PLUGIN_ID,
    name="source_remove_by_name",
    permission_id=OBS_SOURCE_UPDATE_PERMISSION_ID,
)

SOURCE_REMOVE_BY_UUID = EndpointType[RemoveByUuidRequest, RemoveResponse].create_json(
    PLUGIN_ID,
    name="source_remove_by_uuid",
    permission_id=OBS_SOURCE_UPDATE_PERMISSION_ID,
)


class UpdateResponse(TypedDict):
    source: SourceJson


SOURCE_UPDATE = EndpointType[SourceJson, UpdateResponse].create_json(
    PLUGIN_ID,
    name="source_update",
    permission_id=OBS_SOURCE_UPDATE_PERMISSION_ID,
)


class SourceGetByNameRequest(TypedDict):
    scene: NotRequired[str]
    name: str


SOURCE_GET_BY_NAME = EndpointType[SourceGetByNameRequest, SourceJson].create_json(
    PLUGIN_ID,
    name="source_get_by_name",
    permission_id=OBS_SOURCE_READ_PERMISSION_ID,
)


class SourceGetByUuidRequest(TypedDict):
    scene: NotRequired[str]
    uuid: str


SOURCE_GET_BY_UUID = EndpointType[SourceGetByUuidRequest, SourceJson].create_json(
    PLUGIN_ID,
    name="source_get_by_uuid",
    permission_id=OBS_SOURCE_READ_PERMISSION_ID,
)


class SourceListRequest(TypedDict):
    scene: NotRequired[str]


SOURCE_LIST = EndpointType[SourceListRequest, list[SourceJson]].create_json(
    PLUGIN_ID,
    name="source_list",
    permission_id=OBS_SOURCE_READ_PERMISSION_ID,
)


class SceneListRequest(TypedDict): ...


class SceneListResponse(TypedDict):
    scenes: list[SceneJson]


SCENE_LIST = EndpointType[SceneListRequest, SceneListResponse].create_json(
    PLUGIN_ID,
    name="scene_list",
    permission_id=OBS_SCENE_READ_PERMISSION_ID,
)


class SceneGetByNameRequest(TypedDict):
    name: str


class SceneGetByUuidRequest(TypedDict):
    uuid: str


SCENE_GET_BY_NAME = EndpointType[SceneGetByNameRequest, SceneJson].create_json(
    PLUGIN_ID,
    name="scene_get_by_name",
    permission_id=OBS_SCENE_READ_PERMISSION_ID,
)

SCENE_GET_BY_UUID = EndpointType[SceneGetByUuidRequest, SceneJson].create_json(
    PLUGIN_ID,
    name="scene_get_by_uuid",
    permission_id=OBS_SCENE_READ_PERMISSION_ID,
)


class SceneGetCurrentRequest(TypedDict): ...


SCENE_GET_CURRENT = EndpointType[SceneGetCurrentRequest, SceneJson | None].create_json(
    PLUGIN_ID,
    name="scene_get_current",
    permission_id=OBS_SCENE_READ_PERMISSION_ID,
)


class SceneSetCurrentByNameRequest(TypedDict):
    name: str


class SceneSetCurrentByUuidRequest(TypedDict):
    uuid: str


class SceneSetCurrentResponse(TypedDict): ...


SCENE_SET_CURRENT_BY_NAME = EndpointType[SceneSetCurrentByNameRequest, SceneSetCurrentResponse].create_json(
    PLUGIN_ID,
    name="scene_set_current_by_name",
    permission_id=OBS_SCENE_SET_CURRENT_PERMISSION_ID,
)

SCENE_SET_CURRENT_BY_UUID = EndpointType[SceneSetCurrentByUuidRequest, SceneSetCurrentResponse].create_json(
    PLUGIN_ID,
    name="scene_set_current_by_uuid",
    permission_id=OBS_SCENE_SET_CURRENT_PERMISSION_ID,
)


class SceneCreateRequest(TypedDict):
    name: str


class SceneCreateResponse(TypedDict):
    scene: SceneJson


SCENE_CREATE = EndpointType[SceneCreateRequest, SceneCreateResponse].create_json(
    PLUGIN_ID,
    name="scene_create",
    permission_id=OBS_SCENE_CREATE_PERMISSION_ID,
)


class ScreenshotCreateRequest(TypedDict): ...


class ScreenshotCreateResponse(TypedDict): ...


SCREENSHOT_CREATE = EndpointType[ScreenshotCreateRequest, ScreenshotCreateResponse].create_json(
    PLUGIN_ID,
    name="screenshot_create",
    permission_id=OBS_SOURCE_READ_PERMISSION_ID,
)


class ScreenshotGetLastBinaryRequest(TypedDict): ...


@dataclass
class ScreenshotGetLastBinaryResponse:
    data: bytes | None
    version: int = 1

    @staticmethod
    def serialize(item: ScreenshotGetLastBinaryResponse) -> bytes:
        writer = ByteWriter()
        writer.write_uleb128(item.version)
        flags = 1 if item.data is not None else 0
        writer.write_uleb128(flags)
        if item.data is not None:
            writer.write_uint8_array(item.data or b"")
        return writer.finish()

    @staticmethod
    def deserialize(item: bytes) -> ScreenshotGetLastBinaryResponse:
        reader = ByteReader(item)
        version = reader.read_uleb128()
        flags = reader.read_uleb128()
        data: bytes | None = None
        if flags & 1:
            data = reader.read_uint8_array()
        return ScreenshotGetLastBinaryResponse(data=data, version=version)


SCREENSHOT_GET_LAST_BINARY = EndpointType[
    ScreenshotGetLastBinaryRequest, ScreenshotGetLastBinaryResponse
].create_serialized(
    PLUGIN_ID,
    name="screenshot_get_last_binary",
    permission_id=OBS_SOURCE_READ_PERMISSION_ID,
    request_serializer=Serializer.json(),
    response_serializer=ScreenshotGetLastBinaryResponse,
)


EVENT_SIGNAL = SignalType[OBSFrontendEvent].create_json(
    PLUGIN_ID,
    name="event_signal",
)

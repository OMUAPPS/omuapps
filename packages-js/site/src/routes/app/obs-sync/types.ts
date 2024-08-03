import { EndpointType } from '@omujs/omu/extension/endpoint/endpoint.js';

// from typing import Literal, LiteralString, NotRequired, TypedDict

// from omu.extension.endpoint import EndpointType
// from omu.extension.signal.signal import SignalType

// from omuplugin_obssync.const import PLUGIN_ID

// TEST_ENDPOINT_TYPE = EndpointType[None, str].create_json(
//     PLUGIN_ID,
//     name="test",
// )

// type OBSFrontendEvent = Literal[
//     "STREAMING_STARTING",
//     "STREAMING_STARTED",
//     "STREAMING_STOPPING",
//     "STREAMING_STOPPED",
//     "RECORDING_STARTING",
//     "RECORDING_STARTED",
//     "RECORDING_STOPPING",
//     "RECORDING_STOPPED",
//     "SCENE_CHANGED",
//     "SCENE_LIST_CHANGED",
//     "TRANSITION_CHANGED",
//     "TRANSITION_STOPPED",
//     "TRANSITION_LIST_CHANGED",
//     "SCENE_COLLECTION_CHANGED",
//     "SCENE_COLLECTION_LIST_CHANGED",
//     "PROFILE_CHANGED",
//     "PROFILE_LIST_CHANGED",
//     "EXIT",
//     "REPLAY_BUFFER_STARTING",
//     "REPLAY_BUFFER_STARTED",
//     "REPLAY_BUFFER_STOPPING",
//     "REPLAY_BUFFER_STOPPED",
//     "STUDIO_MODE_ENABLED",
//     "STUDIO_MODE_DISABLED",
//     "PREVIEW_SCENE_CHANGED",
//     "SCENE_COLLECTION_CLEANUP",
//     "FINISHED_LOADING",
//     "RECORDING_PAUSED",
//     "RECORDING_UNPAUSED",
//     "TRANSITION_DURATION_CHANGED",
//     "REPLAY_BUFFER_SAVED",
//     "VIRTUALCAM_STARTED",
//     "VIRTUALCAM_STOPPED",
//     "TBAR_VALUE_CHANGED",
//     "SCENE_COLLECTION_CHANGING",
//     "PROFILE_CHANGING",
//     "SCRIPTING_SHUTDOWN",
//     "PROFILE_RENAMED",
//     "SCENE_COLLECTION_RENAMED",
//     "THEME_CHANGED",
//     "SCREENSHOT_TAKEN",
// ]

// type OBSScaleType = Literal[
//     "DISABLE",
//     "POINT",
//     "BICUBIC",
//     "BILINEAR",
//     "LANCZOS",
//     "AREA",
// ]

// class ScaleProperties(TypedDict):
//     scale_filter: OBSScaleType

// class ScalableSource(TypedDict):
//     scale_properties: NotRequired[ScaleProperties]

// type OBSBlendingMethod = Literal[
//     "DEFAULT",
//     "SRGB_OFF",
// ]
// type OBSBlendingType = Literal[
//     "NORMAL",
//     "ADDITIVE",
//     "SUBTRACT",
//     "SCREEN",
//     "MULTIPLY",
//     "LIGHTEN",
//     "DARKEN",
// ]

// class BlendProperties(TypedDict):
//     blending_method: OBSBlendingMethod
//     blending_mode: OBSBlendingType

// class BlendableSource(TypedDict):
//     blend_properties: NotRequired[BlendProperties]

// class SizeInfo(TypedDict):
//     width: NotRequired[int]
//     height: NotRequired[int]

// class SourceType[T: LiteralString, D](TypedDict):
//     type: T
//     data: D
//     name: str
//     uuid: NotRequired[str]
//     scene: NotRequired[str]

// class BrowserSourceData(SizeInfo):
//     url: NotRequired[str]
//     fps_custom: NotRequired[bool]
//     is_local_file: NotRequired[bool]
//     local_file: NotRequired[str]
//     reroute_audio: NotRequired[bool]
//     fps: NotRequired[int]
//     css: NotRequired[str]
//     shutdown: NotRequired[bool]
//     restart_when_active: NotRequired[bool]
//     webpage_control_level: NotRequired[int]

// class BrowserSource(
//     SourceType[Literal["browser_source"], BrowserSourceData],
//     BlendableSource,
//     ScalableSource,
// ): ...

// class TextSourceData(TypedDict):
//     text: NotRequired[str]
//     antialiasing: NotRequired[bool]
//     read_from_file: NotRequired[bool]
//     vertical: NotRequired[bool]
//     gradient: NotRequired[bool]
//     color: NotRequired[int]
//     gradient_color: NotRequired[int]
//     opacity: NotRequired[int]
//     gradient_opacity: NotRequired[int]
//     gradient_dir: NotRequired[float]
//     bk_color: NotRequired[int]
//     bk_opacity: NotRequired[int]
//     align: NotRequired[Literal["left", "center", "right"]]
//     valign: NotRequired[Literal["top", "center", "bottom"]]
//     outline: NotRequired[bool]
//     outline_size: NotRequired[int]
//     outline_color: NotRequired[int]
//     outline_opacity: NotRequired[int]
//     chatlog: NotRequired[bool]
//     extents: NotRequired[bool]
//     chatlog_lines: NotRequired[int]
//     extents_cx: NotRequired[int]
//     extents_cy: NotRequired[int]
//     extents_wrap: NotRequired[bool]

// class TextSource(
//     SourceType[Literal["text_gdiplus"], TextSourceData],
//     BlendableSource,
//     ScalableSource,
// ): ...

// type SourceJson = BrowserSource | TextSource

// browser: SourceJson = {
//     "type": "browser_source",
//     "name": "browser",
//     "data": {
//         "url": "https://www.google.com",
//         "width": 1920,
//         "height": 1080,
//     },
// }

// class SceneJson(TypedDict):
//     name: str
//     sources: list[SourceJson]

// class CreateResponse(TypedDict):
//     source: SourceType

// SOURCE_CREATE = EndpointType[SourceJson, CreateResponse].create_json(
//     PLUGIN_ID,
//     name="source_create",
// )

// class RemoveByNameRequest(TypedDict):
//     name: str

// class RemoveByUuidRequest(TypedDict):
//     uuid: str

// class RemoveResponse(TypedDict): ...

// SOURCE_REMOVE_BY_NAME = EndpointType[RemoveByNameRequest, RemoveResponse].create_json(
//     PLUGIN_ID,
//     name="source_remove_by_name",
// )

// SOURCE_REMOVE_BY_UUID = EndpointType[RemoveByUuidRequest, RemoveResponse].create_json(
//     PLUGIN_ID,
//     name="source_remove_by_uuid",
// )

// class UpdateResponse(TypedDict):
//     source: SourceType

// SOURCE_UPDATE = EndpointType[SourceJson, UpdateResponse].create_json(
//     PLUGIN_ID,
//     name="source_update",
// )

// class SourceGetByNameRequest(TypedDict):
//     scene: NotRequired[str]
//     name: str

// SOURCE_GET_BY_NAME = EndpointType[SourceGetByNameRequest, SourceJson].create_json(
//     PLUGIN_ID,
//     name="source_get_by_name",
// )

// class SourceGetByUuidRequest(TypedDict):
//     scene: NotRequired[str]
//     uuid: str

// SOURCE_GET_BY_UUID = EndpointType[SourceGetByUuidRequest, SourceJson].create_json(
//     PLUGIN_ID,
//     name="source_get_by_uuid",
// )

// class SourceListRequest(TypedDict):
//     scene: NotRequired[str]

// SOURCE_LIST = EndpointType[SourceListRequest, list[SourceJson]].create_json(
//     PLUGIN_ID,
//     name="source_list",
// )

// class SceneListRequest(TypedDict): ...

// class SceneListResponse(TypedDict):
//     scenes: list[SceneJson]

// SCENE_LIST = EndpointType[SceneListRequest, SceneListResponse].create_json(
//     PLUGIN_ID,
//     name="scene_list",
// )

// class SceneGetRequest(TypedDict):
//     scene: NotRequired[str]

// SCENE_GET = EndpointType[SceneGetRequest, SceneJson].create_json(
//     PLUGIN_ID,
//     name="scene_get",
// )

// EVENT_SIGNAL = SignalType[OBSFrontendEvent].create_json(
//     PLUGIN_ID,
//     name="event_signal",
// )

import { SignalType } from '@omujs/omu/extension/signal/signal.js';
import { APP_ID } from './app.js';

export const PLUGIN_ID = APP_ID.join('plugin');

export type OBSFrontendEvent =
    | 'STREAMING_STARTING'
    | 'STREAMING_STARTED'
    | 'STREAMING_STOPPING'
    | 'STREAMING_STOPPED'
    | 'RECORDING_STARTING'
    | 'RECORDING_STARTED'
    | 'RECORDING_STOPPING'
    | 'RECORDING_STOPPED'
    | 'SCENE_CHANGED'
    | 'SCENE_LIST_CHANGED'
    | 'TRANSITION_CHANGED'
    | 'TRANSITION_STOPPED'
    | 'TRANSITION_LIST_CHANGED'
    | 'SCENE_COLLECTION_CHANGED'
    | 'SCENE_COLLECTION_LIST_CHANGED'
    | 'PROFILE_CHANGED'
    | 'PROFILE_LIST_CHANGED'
    | 'EXIT'
    | 'REPLAY_BUFFER_STARTING'
    | 'REPLAY_BUFFER_STARTED'
    | 'REPLAY_BUFFER_STOPPING'
    | 'REPLAY_BUFFER_STOPPED'
    | 'STUDIO_MODE_ENABLED'
    | 'STUDIO_MODE_DISABLED'
    | 'PREVIEW_SCENE_CHANGED'
    | 'SCENE_COLLECTION_CLEANUP'
    | 'FINISHED_LOADING'
    | 'RECORDING_PAUSED'
    | 'RECORDING_UNPAUSED'
    | 'TRANSITION_DURATION_CHANGED'
    | 'REPLAY_BUFFER_SAVED'
    | 'VIRTUALCAM_STARTED'
    | 'VIRTUALCAM_STOPPED'
    | 'TBAR_VALUE_CHANGED'
    | 'SCENE_COLLECTION_CHANGING'
    | 'PROFILE_CHANGING'
    | 'SCRIPTING_SHUTDOWN'
    | 'PROFILE_RENAMED'
    | 'SCENE_COLLECTION_RENAMED'
    | 'THEME_CHANGED'
    | 'SCREENSHOT_TAKEN';

export type OBSScaleType = 'DISABLE' | 'POINT' | 'BICUBIC' | 'BILINEAR' | 'LANCZOS' | 'AREA';

export type OBSBlendingMethod = 'DEFAULT' | 'SRGB_OFF';

export type OBSBlendingType =
    | 'NORMAL'
    | 'ADDITIVE'
    | 'SUBTRACT'
    | 'SCREEN'
    | 'MULTIPLY'
    | 'LIGHTEN'
    | 'DARKEN';

export type ScaleProperties = {
    scale_filter: OBSScaleType;
};

export type ScalableSource = {
    scale_properties?: ScaleProperties;
};

export type BlendProperties = {
    blending_method: OBSBlendingMethod;
    blending_mode: OBSBlendingType;
};

export type BlendableSource = {
    blend_properties?: BlendProperties;
};

export type SizeInfo = {
    width?: number;
    height?: number;
};

export interface SourceType<T extends string, D> {
    type: T;
    data: D;
    name: string;
    uuid?: string;
    scene?: string;
}

export type BrowserSourceData = SizeInfo & {
    url?: string;
    fps_custom?: boolean;
    is_local_file?: boolean;
    local_file?: string;
    reroute_audio?: boolean;
    fps?: number;
    css?: string;
    shutdown?: boolean;
    restart_when_active?: boolean;
    webpage_control_level?: number;
};

export type BrowserSource = SourceType<'browser_source', BrowserSourceData> &
    BlendableSource &
    ScalableSource;

export type TextSourceData = {
    text?: string;
    antialiasing?: boolean;
    read_from_file?: boolean;
    vertical?: boolean;
    gradient?: boolean;
    color?: number;
    gradient_color?: number;
    opacity?: number;
    gradient_opacity?: number;
    gradient_dir?: number;
    bk_color?: number;
    bk_opacity?: number;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'center' | 'bottom';
    outline?: boolean;
    outline_size?: number;
    outline_color?: number;
    outline_opacity?: number;
    chatlog?: boolean;
    extents?: boolean;
    chatlog_lines?: number;
    extents_cx?: number;
    extents_cy?: number;
    extents_wrap?: boolean;
};

export type TextSource = SourceType<'text_gdiplus', TextSourceData> &
    BlendableSource &
    ScalableSource;

export type SourceJson = BrowserSource | TextSource;

export type SceneJson = {
    name: string;
    sources: SourceJson[];
};

export type CreateResponse = {
    source: SourceType<string, unknown>;
};

export const SOURCE_CREATE = EndpointType.createJson<SourceJson, CreateResponse>(PLUGIN_ID, {
    name: 'source_create',
});

export type RemoveByNameRequest = {
    name: string;
};

export type RemoveByUuidRequest = {
    uuid: string;
};

export type RemoveResponse = unknown;

export const SOURCE_REMOVE_BY_NAME = EndpointType.createJson<RemoveByNameRequest, RemoveResponse>(
    PLUGIN_ID,
    {
        name: 'source_remove_by_name',
    },
);

export const SOURCE_REMOVE_BY_UUID = EndpointType.createJson<RemoveByUuidRequest, RemoveResponse>(
    PLUGIN_ID,
    {
        name: 'source_remove_by_uuid',
    },
);

export type UpdateResponse = {
    source: SourceType<string, unknown>;
};

export const SOURCE_UPDATE = EndpointType.createJson<SourceJson, UpdateResponse>(PLUGIN_ID, {
    name: 'source_update',
});

export type SourceGetByNameRequest = {
    scene?: string;
    name: string;
};

export const SOURCE_GET_BY_NAME = EndpointType.createJson<SourceGetByNameRequest, SourceJson>(
    PLUGIN_ID,
    {
        name: 'source_get_by_name',
    },
);

export type SourceGetByUuidRequest = {
    scene?: string;
    uuid: string;
};

export const SOURCE_GET_BY_UUID = EndpointType.createJson<SourceGetByUuidRequest, SourceJson>(
    PLUGIN_ID,
    {
        name: 'source_get_by_uuid',
    },
);

export type SourceListRequest = {
    scene?: string;
};

export const SOURCE_LIST = EndpointType.createJson<SourceListRequest, SourceJson[]>(PLUGIN_ID, {
    name: 'source_list',
});

export type SceneListRequest = unknown;

export type SceneListResponse = {
    scenes: SceneJson[];
};

export const SCENE_LIST = EndpointType.createJson<SceneListRequest, SceneListResponse>(PLUGIN_ID, {
    name: 'scene_list',
});

export type SceneGetRequest = {
    scene?: string;
};

export const SCENE_GET = EndpointType.createJson<SceneGetRequest, SceneJson>(PLUGIN_ID, {
    name: 'scene_get',
});

export const EVENT_SIGNAL = SignalType.createJson<OBSFrontendEvent>(PLUGIN_ID, {
    name: 'event_signal',
});

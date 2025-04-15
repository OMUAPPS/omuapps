import { EndpointType } from '@omujs/omu/extension/endpoint/endpoint.js';
import { SignalType } from '@omujs/omu/extension/signal/signal.js';

import { PLUGIN_ID } from './const.js';
import {
    OBS_SCENE_READ_PERMISSION_ID,
    OBS_SCENE_SET_CURRENT_PERMISSION_ID,
} from './permissions.js';

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
    uuid: string;
    sources: SourceJson[];
};

export type CreateResponse = {
    source: SourceJson;
};

export const SOURCE_CREATE: EndpointType<SourceJson, CreateResponse> = EndpointType.createJson<SourceJson, CreateResponse>(PLUGIN_ID, {
    name: 'source_create',
});

export const SOURCE_ADD: EndpointType<SourceJson, CreateResponse> = EndpointType.createJson<SourceJson, CreateResponse>(PLUGIN_ID, {
    name: 'source_add',
});

// 100:% = full width/height of the scene
// 100:vw = full width of the scene
// 100:vh = full height of the scene
// 100:px = 100 pixels
export type Unit = 'px' | 'vw' | 'vh' | '%';
export type UnitValue = number | `${number}:${Unit}`;
export type CreateBrowserRequest = {
    name: string;
    scene?: string;
    url: string;
    width?: UnitValue;
    height?: UnitValue;
    css?: string;
} & BlendableSource & ScalableSource;

export const BROWSER_CREATE: EndpointType<CreateBrowserRequest, CreateResponse> = EndpointType.createJson<CreateBrowserRequest, CreateResponse>(PLUGIN_ID, {
    name: 'browser_create',
});

export const BROWSER_ADD: EndpointType<CreateBrowserRequest, CreateResponse> = EndpointType.createJson<CreateBrowserRequest, CreateResponse>(PLUGIN_ID, {
    name: 'browser_add',
});

export type RemoveByNameRequest = {
    name: string;
};

export type RemoveByUuidRequest = {
    uuid: string;
};

export type RemoveResponse = unknown;

export const SOURCE_REMOVE_BY_NAME: EndpointType<RemoveByNameRequest> = EndpointType.createJson<RemoveByNameRequest, RemoveResponse>(PLUGIN_ID, {
    name: 'source_remove_by_name',
});

export const SOURCE_REMOVE_BY_UUID: EndpointType<RemoveByUuidRequest> = EndpointType.createJson<RemoveByUuidRequest, RemoveResponse>(PLUGIN_ID, {
    name: 'source_remove_by_uuid',
});

export type UpdateResponse = {
    source: SourceJson;
};

export const SOURCE_UPDATE: EndpointType<SourceJson, UpdateResponse> = EndpointType.createJson<SourceJson, UpdateResponse>(PLUGIN_ID, {
    name: 'source_update',
});

export type SourceGetByNameRequest = {
    scene?: string;
    name: string;
};

export const SOURCE_GET_BY_NAME: EndpointType<SourceGetByNameRequest, SourceJson> = EndpointType.createJson<SourceGetByNameRequest, SourceJson>(PLUGIN_ID, {
    name: 'source_get_by_name',
});

export type SourceGetByUuidRequest = {
    scene?: string;
    uuid: string;
};

export const SOURCE_GET_BY_UUID: EndpointType<SourceGetByUuidRequest, SourceJson> = EndpointType.createJson<SourceGetByUuidRequest, SourceJson>(PLUGIN_ID, {
    name: 'source_get_by_uuid',
});

export type SourceListRequest = {
    scene?: string;
};

export const SOURCE_LIST: EndpointType<SourceListRequest, SourceJson[]> = EndpointType.createJson<SourceListRequest, SourceJson[]>(PLUGIN_ID, {
    name: 'source_list',
});

export type SceneListRequest = unknown;

export type SceneListResponse = {
    scenes: SceneJson[];
};

export const SCENE_LIST: EndpointType<unknown, SceneListResponse> = EndpointType.createJson<SceneListRequest, SceneListResponse>(PLUGIN_ID, {
    name: 'scene_list',
});

export type SceneGetByNameRequest = {
    name: string;
};

export type SceneGetByUuidRequest = {
    uuid: string;
};

export const SCENE_GET_BY_NAME: EndpointType<SceneGetByNameRequest, SceneJson> = EndpointType.createJson<SceneGetByNameRequest, SceneJson>(PLUGIN_ID, {
    name: 'scene_get_by_name',
});

export const SCENE_GET_BY_UUID: EndpointType<SceneGetByUuidRequest, SceneJson> = EndpointType.createJson<SceneGetByUuidRequest, SceneJson>(PLUGIN_ID, {
    name: 'scene_get_by_uuid',
});

export type SceneGetCurrentRequest = unknown;

export const SCENE_GET_CURRENT: EndpointType<unknown, SceneJson | null> = EndpointType.createJson<SceneGetCurrentRequest, SceneJson | null>(PLUGIN_ID, {
    name: 'scene_get_current',
    permissionId: OBS_SCENE_READ_PERMISSION_ID,
});

export type SceneSetCurrentByNameRequest = {
    name: string;
};

export type SceneSetCurrentByUuidRequest = {
    uuid: string;
};

export type SceneSetCurrentResponse = unknown;

export const SCENE_SET_CURRENT_BY_NAME: EndpointType<SceneSetCurrentByNameRequest> = EndpointType.createJson<
    SceneSetCurrentByNameRequest,
    SceneSetCurrentResponse
>(PLUGIN_ID, {
    name: 'scene_set_current_by_name',
    permissionId: OBS_SCENE_SET_CURRENT_PERMISSION_ID,
});

export const SCENE_SET_CURRENT_BY_UUID: EndpointType<SceneSetCurrentByUuidRequest> = EndpointType.createJson<
    SceneSetCurrentByUuidRequest,
    SceneSetCurrentResponse
>(PLUGIN_ID, {
    name: 'scene_set_current_by_uuid',
    permissionId: OBS_SCENE_SET_CURRENT_PERMISSION_ID,
});

export type SceneCreateRequest = {
    name: string;
}

export type SceneCreateResponse = {
    scene: SceneJson;
}

export const SCENE_CREATE: EndpointType<SceneCreateRequest, SceneCreateResponse> = EndpointType.createJson<SceneCreateRequest, SceneCreateResponse>(PLUGIN_ID, {
    name: 'scene_create',
});

export const EVENT_SIGNAL: SignalType<OBSFrontendEvent> = SignalType.createJson<OBSFrontendEvent>(PLUGIN_ID, {
    name: 'event_signal',
});

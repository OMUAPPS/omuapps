from __future__ import annotations

import asyncio
import threading

from loguru import logger
from omu.app import App
from omu.helper import map_optional
from omu.omu import Omu
from omu.token import JsonTokenProvider
from omuplugin_obs.version import VERSION

from ..const import PLUGIN_ID
from ..obs.data import OBSData
from ..obs.obs import OBS, OBSFrontendEvent
from ..obs.scene import (
    OBSBlendingMethod,
    OBSBlendingType,
    OBSScaleType,
    OBSScene,
    OBSSceneItem,
)
from ..obs.source import OBSSource
from ..types import (
    EVENT_SIGNAL,
    SCENE_GET_BY_NAME,
    SCENE_GET_BY_UUID,
    SCENE_GET_CURRENT,
    SCENE_LIST,
    SCENE_SET_CURRENT_BY_NAME,
    SCENE_SET_CURRENT_BY_UUID,
    SOURCE_ADD,
    SOURCE_CREATE,
    SOURCE_GET_BY_NAME,
    SOURCE_GET_BY_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE_BY_NAME,
    SOURCE_REMOVE_BY_UUID,
    SOURCE_UPDATE,
    BlendProperties,
    BrowserSourceData,
    CreateResponse,
    RemoveByNameRequest,
    RemoveByUuidRequest,
    RemoveResponse,
    ScaleProperties,
    SceneGetByNameRequest,
    SceneGetByUuidRequest,
    SceneGetCurrentRequest,
    SceneJson,
    SceneListRequest,
    SceneListResponse,
    SceneSetCurrentByNameRequest,
    SceneSetCurrentByUuidRequest,
    SceneSetCurrentResponse,
    SourceGetByNameRequest,
    SourceGetByUuidRequest,
    SourceJson,
    SourceListRequest,
    TextSourceData,
    UpdateResponse,
)
from .config import get_token_path

APP = App(
    PLUGIN_ID,
    version=VERSION,
    metadata={
        "locale": "en",
        "name": {
            "ja": "OBSプラグイン",
            "en": "OBS Plugin",
        },
        "description": {
            "ja": "アプリがOBSを制御するためのプラグイン",
            "en": "Plugin for app to control OBS",
        },
    },
)

global loop
loop = asyncio.new_event_loop()
omu = Omu(
    APP,
    loop=loop,
    token=JsonTokenProvider(get_token_path()),
)


def source_to_json(scene_item: OBSSceneItem) -> SourceJson | None:
    source = scene_item.source
    blend_properties = BlendProperties(
        blending_method=scene_item.blending_method.name,
        blending_mode=scene_item.blending_mode.name,
    )
    scale_properties = ScaleProperties(
        scale_filter=scene_item.scale_filter.name,
    )
    if source.id == "browser_source":
        return {
            "type": "browser_source",
            "name": source.name,
            "data": BrowserSourceData(**source.settings.to_json()),
            "uuid": source.uuid,
            "scene": scene_item.scene.source.name,
            "blend_properties": blend_properties,
            "scale_properties": scale_properties,
        }
    elif source.id == "text_gdiplus":
        return {
            "type": "text_gdiplus",
            "name": source.name,
            "data": TextSourceData(**source.settings.to_json()),
            "uuid": source.uuid,
            "scene": scene_item.scene.source.name,
            "blend_properties": blend_properties,
            "scale_properties": scale_properties,
        }
    else:
        return None


def get_scene(scene_name: str | None) -> OBSScene:
    if scene_name:
        scene = OBSScene.get_scene_by_name(scene_name)
        if scene is None:
            raise ValueError(f"Scene with name {scene_name} does not exist")
    else:
        current_scene = OBS.frontend_get_current_scene()
        if current_scene is None:
            raise ValueError("No current scene")
        scene = OBS.get_scene_from_source(current_scene)
    return scene


def get_name(name: str) -> str:
    existing_source = OBSSource.get_source_by_name(name)
    if existing_source is not None:
        removed = existing_source.removed
        existing_source.release()
        if removed:
            return name
    i = 1
    while True:
        new_name = f"{name} ({i})"
        existing_source = OBSSource.get_source_by_name(new_name)
        if existing_source is None:
            return new_name
        existing_source.release()
        i += 1


def create_obs_source(scene: OBSScene, source_json: SourceJson) -> OBSSceneItem:
    if "uuid" in source_json:
        raise NotImplementedError("uuid is not supported yet")
    settings = map_optional(dict(source_json.get("data")), OBSData.from_json)
    obs_source = OBSSource.create(
        source_json["type"],
        source_json["name"],
        settings,
    )
    scene_item = scene.add(obs_source)
    if settings is not None:
        settings.release()
    obs_source.release()
    if "blend_properties" in source_json:
        blending_method = source_json["blend_properties"]["blending_method"]
        blending_mode = source_json["blend_properties"]["blending_mode"]
        scene_item.blending_method = OBSBlendingMethod[blending_method]
        scene_item.blending_mode = OBSBlendingType[blending_mode]
    if "scale_properties" in source_json:
        scale_filter = source_json["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType[scale_filter]
    return scene_item


@omu.endpoints.bind(endpoint_type=SOURCE_CREATE)
async def source_create(source: SourceJson) -> CreateResponse:
    existing_source = OBSSource.get_source_by_name(source["name"])
    if existing_source is not None:
        existing_source.release()
        if not existing_source.removed:
            raise ValueError(f"Source with name {source['name']} already exists")
    scene = get_scene(source.get("scene"))
    scene_item = create_obs_source(scene, source)
    scene.release()
    if "blend_properties" in source:
        blending_method = source["blend_properties"]["blending_method"]
        blending_mode = source["blend_properties"]["blending_mode"]
        scene_item.blending_method = OBSBlendingMethod[blending_method]
        scene_item.blending_mode = OBSBlendingType[blending_mode]
    if "scale_properties" in source:
        scale_filter = source["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType[scale_filter]
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {source['type']} is not supported")
    return {"source": source_json}


@omu.endpoints.bind(endpoint_type=SOURCE_ADD)
async def source_add(source: SourceJson) -> CreateResponse:
    source["name"] = get_name(source["name"])
    scene = get_scene(source.get("scene"))
    scene_item = create_obs_source(scene, source)
    scene.release()
    if "blend_properties" in source:
        blending_method = source["blend_properties"]["blending_method"]
        blending_mode = source["blend_properties"]["blending_mode"]
        scene_item.blending_method = OBSBlendingMethod[blending_method]
        scene_item.blending_mode = OBSBlendingType[blending_mode]
    if "scale_properties" in source:
        scale_filter = source["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType[scale_filter]
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {source['type']} is not supported")
    return {"source": source_json}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE_BY_NAME)
async def source_remove_by_name(request: RemoveByNameRequest) -> RemoveResponse:
    obs_source = OBSSource.get_source_by_name(request["name"])
    if obs_source is None:
        raise ValueError(f"Source with name {request['name']} does not exist")
    if obs_source.removed:
        raise ValueError(f"Source with name {request['name']} is already removed")
    obs_source.remove()
    obs_source.release()
    return {}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE_BY_UUID)
async def source_remove_by_uuid(request: RemoveByUuidRequest) -> RemoveResponse:
    obs_source = OBSSource.get_source_by_uuid(request["uuid"])
    if obs_source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    if obs_source.removed:
        raise ValueError(f"Source with uuid {request['uuid']} is already removed")
    obs_source.remove()
    obs_source.release()
    return {}


@omu.endpoints.bind(endpoint_type=SOURCE_UPDATE)
async def source_update(source_json: SourceJson) -> UpdateResponse:
    if "uuid" in source_json:
        source = OBSSource.get_source_by_uuid(source_json["uuid"])
        if source is None:
            raise ValueError(f"Source with uuid {source_json['uuid']} does not exist")
    else:
        source = OBSSource.get_source_by_name(source_json["name"])
    if source is None:
        raise ValueError(f"Source with name {source_json['name']} does not exist")

    new_data = OBSData.from_json(dict(source_json["data"]))
    source.settings.apply(new_data)
    new_data.release()

    scene = get_scene(source_json.get("scene"))
    scene_item = scene.sceneitem_from_source(source)
    scene.release()
    if scene_item is None:
        raise ValueError(f"Source with name {source_json['name']} is not in the scene")
    if "blend_properties" in source_json:
        blending_method = source_json["blend_properties"]["blending_method"]
        blending_mode = source_json["blend_properties"]["blending_mode"]
        scene_item.blending_method = OBSBlendingMethod[blending_method]
        scene_item.blending_mode = OBSBlendingType[blending_mode]
    if "scale_properties" in source_json:
        scale_filter = source_json["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType[scale_filter]
    updated_json = source_to_json(scene_item)
    scene_item.release()
    try:
        if updated_json is None:
            raise ValueError(f"Source with type {source.id} is not supported")
    finally:
        source.release()
    return {"source": updated_json}


@omu.endpoints.bind(endpoint_type=SOURCE_GET_BY_NAME)
async def source_get_by_name(request: SourceGetByNameRequest) -> SourceJson:
    scene = get_scene(request.get("scene"))
    scene_item = scene.find_source(request["name"])
    scene.release()
    if scene_item is None:
        raise ValueError(f"Source with name {request['name']} does not exist")
    source_json = source_to_json(scene_item)
    try:
        if source_json is None:
            raise ValueError(
                f"Source with type {scene_item.source.id} is not supported"
            )
    finally:
        scene_item.release()
    return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_GET_BY_UUID)
async def source_get_by_uuid(request: SourceGetByUuidRequest) -> SourceJson:
    scene_name = request.get("scene")
    if scene_name:
        scene = OBSScene.get_scene_by_name(scene_name)
        if scene is None:
            raise ValueError(f"Scene with name {scene_name} does not exist")
    else:
        current_scene = OBS.frontend_get_current_scene()
        if current_scene is None:
            raise ValueError("No current scene")
        scene = current_scene.scene
    source = OBSSource.get_source_by_uuid(request["uuid"])
    if source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    scene_item = scene.sceneitem_from_source(source)
    scene.release()
    source_json = source_to_json(scene_item)
    scene_item.release()
    try:
        if source_json is None:
            raise ValueError(f"Source with type {source.type} is not supported")
    finally:
        source.release()
    return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_LIST)
async def source_list(request: SourceListRequest) -> list[SourceJson]:
    scene_name = request.get("scene")
    if scene_name:
        scene = OBSScene.get_scene_by_name(scene_name)
        if scene is None:
            raise ValueError(f"Scene with name {scene_name} does not exist")
    else:
        current_scene = OBS.frontend_get_current_scene()
        if current_scene is None:
            raise ValueError("No current scene")
        scene = current_scene.scene
    scene_items = scene.enum_items()
    scene.release()
    sources = []
    for scene_item in scene_items:
        source_json = source_to_json(scene_item)
        if source_json is not None:
            sources.append(source_json)
        scene_item.release()
    return sources


def scene_to_json(scene: OBSScene) -> SceneJson:
    sources = []
    for scene_item in scene.enum_items():
        source_json = source_to_json(scene_item)
        if source_json is not None:
            sources.append(source_json)
        scene_item.release()
    return {
        "name": scene.source.name,
        "uuid": scene.source.uuid,
        "sources": sources,
    }


@omu.endpoints.bind(endpoint_type=SCENE_LIST)
async def scene_list(request: SceneListRequest) -> SceneListResponse:
    scenes = OBS.get_scenes()
    return {"scenes": [scene_to_json(scene) for scene in scenes]}


@omu.endpoints.bind(endpoint_type=SCENE_GET_BY_NAME)
async def scene_get_by_name(request: SceneGetByNameRequest) -> SceneJson:
    scene = get_scene(request["name"])
    scene_json = scene_to_json(scene)
    scene.release()
    return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_GET_BY_UUID)
async def scene_get_by_uuid(request: SceneGetByUuidRequest) -> SceneJson:
    source = OBSSource.get_source_by_uuid(request["uuid"])
    if source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    if not source.is_scene:
        source.release()
        raise ValueError(f"Source with uuid {request['uuid']} is not a scene")
    scene = source.scene
    source.release()
    scene_json = scene_to_json(scene)
    scene.release()
    return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_GET_CURRENT)
async def scene_get_current(request: SceneGetCurrentRequest) -> SceneJson:
    scene = get_scene(request.get("scene"))
    scene_json = scene_to_json(scene)
    scene.release()
    return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_SET_CURRENT_BY_NAME)
async def scene_set_current_by_name(
    request: SceneSetCurrentByNameRequest,
) -> SceneSetCurrentResponse:
    scene = OBSScene.get_scene_by_name(request["name"])
    if scene is None:
        raise ValueError(f"Scene with name {request['name']} does not exist")
    OBS.frontend_set_current_scene(scene)
    scene.release()
    return {}


@omu.endpoints.bind(endpoint_type=SCENE_SET_CURRENT_BY_UUID)
async def scene_set_current_by_uuid(
    request: SceneSetCurrentByUuidRequest,
) -> SceneSetCurrentResponse:
    source = OBSSource.get_source_by_uuid(request["uuid"])
    if source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    if not source.is_scene:
        source.release()
        raise ValueError(f"Source with uuid {request['uuid']} is not a scene")
    scene = source.scene
    if scene is None:
        source.release()
        raise ValueError(f"Scene with uuid {request['uuid']} does not exist")
    OBS.frontend_set_current_scene(scene)
    source.release()
    scene.release()
    return {}


event_signal = omu.signals.get(EVENT_SIGNAL)


@OBS.frontend_add_event_callback
def on_event(event: OBSFrontendEvent):
    loop.create_task(event_signal.notify(event.name))


@omu.on_ready
async def on_ready():
    print("OBS Plugin is ready")


_LOOP: asyncio.AbstractEventLoop | None = None
_THREAD: threading.Thread | None = None


def run_stuff():
    print("Running OBS Plugin")
    global _LOOP
    _LOOP = asyncio.new_event_loop()
    asyncio.set_event_loop(_LOOP)

    omu.set_loop(_LOOP)
    omu.loop.create_task(start_omu())

    _LOOP.run_forever()

    _LOOP.close()
    _LOOP = None


def script_load():
    global _THREAD
    _THREAD = threading.Thread(None, run_stuff, daemon=True)
    _THREAD.start()


async def start_omu():
    try:
        if omu.running:
            await omu.stop()
        await omu.start()
    except Exception:
        logger.warning("Failed to start OBS Plugin: {e}")


def script_unload():
    global _LOOP, _THREAD
    if _LOOP is not None:
        _LOOP.call_soon_threadsafe(lambda l: l.stop(), _LOOP)

    if _THREAD is not None:
        _THREAD.join(timeout=5)
        _THREAD = None


async def stop_omu():
    await omu.stop()
    print("OBS Plugin is stopped")

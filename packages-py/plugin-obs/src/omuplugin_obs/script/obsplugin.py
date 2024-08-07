import asyncio
from pathlib import Path

from loguru import logger
from omu.app import App
from omu.helper import map_optional
from omu.omu import Omu
from omu.token import JsonTokenProvider
from omuobs.data import OBSData
from omuobs.obs import OBS, OBSFrontendEvent
from omuobs.scene import (
    OBSBlendingMethod,
    OBSBlendingType,
    OBSScaleType,
    OBSScene,
    OBSSceneItem,
)
from omuobs.source import OBSSource
from omuplugin_obs.const import PLUGIN_ID
from omuplugin_obs.types import (
    EVENT_SIGNAL,
    SCENE_GET,
    SCENE_GET_CURRENT,
    SCENE_LIST,
    SCENE_SET_BY_NAME,
    SCENE_SET_BY_UUID,
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
    SceneGetCurrentRequest,
    SceneGetRequest,
    SceneJson,
    SceneListRequest,
    SceneListResponse,
    SceneSetByNameRequest,
    SceneSetByUuidRequest,
    SceneSetResponse,
    SourceGetByNameRequest,
    SourceGetByUuidRequest,
    SourceJson,
    SourceListRequest,
    TextSourceData,
    UpdateResponse,
)
from omuplugin_obs.version import VERSION

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
    token=JsonTokenProvider(Path(__file__).parent / "token.json"),
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
        scene = OBS.frontend_get_current_scene().scene
    return scene


def create_obs_source(scene: OBSScene, source_json: SourceJson) -> OBSSceneItem:
    if "uuid" in source_json:
        raise NotImplementedError("uuid is not supported yet")
    obs_source = OBSSource.create(
        source_json["type"],
        source_json["name"],
        map_optional(dict(source_json.get("data")), OBSData.from_json),
        None,
    )
    scene_item = scene.add(obs_source)
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
    if existing_source is not None and not existing_source.removed:
        raise ValueError(f"Source with name {source['name']} already exists")
    scene = get_scene(source.get("scene"))
    scene_item = create_obs_source(scene, source)
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
    return {}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE_BY_UUID)
async def source_remove_by_uuid(request: RemoveByUuidRequest) -> RemoveResponse:
    obs_source = OBSSource.get_source_by_uuid(request["uuid"])
    if obs_source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    if obs_source.removed:
        raise ValueError(f"Source with uuid {request['uuid']} is already removed")
    obs_source.remove()
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

    scene = get_scene(source_json.get("scene"))
    scene_item = scene.sceneitem_from_source(source)
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
    if updated_json is None:
        raise ValueError(f"Source with type {source.id} is not supported")
    return {"source": updated_json}


@omu.endpoints.bind(endpoint_type=SOURCE_GET_BY_NAME)
async def source_get_by_name(request: SourceGetByNameRequest) -> SourceJson:
    scene = get_scene(request.get("scene"))
    scene_item = scene.find_source(request["name"])
    if scene_item is None:
        raise ValueError(f"Source with name {request['name']} does not exist")
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {scene_item.source.id} is not supported")
    return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_GET_BY_UUID)
async def source_get_by_uuid(request: SourceGetByUuidRequest) -> SourceJson:
    scene_name = request.get("scene")
    if scene_name:
        scene = OBSScene.get_scene_by_name(scene_name)
        if scene is None:
            raise ValueError(f"Scene with name {scene_name} does not exist")
    else:
        scene = OBS.frontend_get_current_scene().scene
    source = OBSSource.get_source_by_uuid(request["uuid"])
    if source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    scene_item = scene.sceneitem_from_source(source)
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {source.type} is not supported")
    return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_LIST)
async def source_list(request: SourceListRequest) -> list[SourceJson]:
    scene_name = request.get("scene")
    if scene_name:
        scene = OBSScene.get_scene_by_name(scene_name)
        if scene is None:
            raise ValueError(f"Scene with name {scene_name} does not exist")
    else:
        scene = OBS.frontend_get_current_scene().scene
    if "scene" in request:
        scene = OBSScene.get_scene_by_name(request["scene"])
        if scene is None:
            raise ValueError(f"Scene with name {request['scene']} does not exist")
    scene_items = scene.enum_items()
    return [*filter(None, map(source_to_json, scene_items))]


def scene_to_json(scene: OBSScene) -> SceneJson:
    return {
        "name": scene.source.name,
        "sources": [*filter(None, map(source_to_json, scene.enum_items()))],
    }


@omu.endpoints.bind(endpoint_type=SCENE_LIST)
async def scene_list(request: SceneListRequest) -> SceneListResponse:
    scenes = OBS.get_scenes()
    return {"scenes": [scene_to_json(scene) for scene in scenes]}


@omu.endpoints.bind(endpoint_type=SCENE_GET)
async def scene_current(request: SceneGetRequest) -> SceneJson:
    scene = get_scene(request.get("scene"))
    return scene_to_json(scene)


@omu.endpoints.bind(endpoint_type=SCENE_GET_CURRENT)
async def scene_get_current(request: SceneGetCurrentRequest) -> SceneJson:
    scene = get_scene(request.get("scene"))
    return scene_to_json(scene)


@omu.endpoints.bind(endpoint_type=SCENE_SET_BY_NAME)
async def scene_set_by_name(request: SceneSetByNameRequest) -> SceneSetResponse:
    scene = OBSScene.get_scene_by_name(request["name"])
    if scene is None:
        raise ValueError(f"Scene with name {request['name']} does not exist")
    OBS.frontend_set_current_scene(scene)
    return {}


@omu.endpoints.bind(endpoint_type=SCENE_SET_BY_UUID)
async def scene_set_by_uuid(request: SceneSetByUuidRequest) -> SceneSetResponse:
    source = OBSSource.get_source_by_uuid(request["uuid"])
    if source is None:
        raise ValueError(f"Source with uuid {request['uuid']} does not exist")
    if not source.is_scene:
        raise ValueError(f"Source with uuid {request['uuid']} is not a scene")
    scene = source.scene
    if scene is None:
        raise ValueError(f"Scene with uuid {request['uuid']} does not exist")
    OBS.frontend_set_current_scene(scene)
    return {}


event_signal = omu.signal.get(EVENT_SIGNAL)


@OBS.frontend_add_event_callback
def on_event(event: OBSFrontendEvent):
    loop.create_task(event_signal.notify(event.name))


@omu.on_ready
async def on_ready():
    logger.info("OBS Plugin is ready")


def start():
    omu.run()

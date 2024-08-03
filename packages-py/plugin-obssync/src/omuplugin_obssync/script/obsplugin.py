import asyncio
from pathlib import Path

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
from omuplugin_obssync.const import PLUGIN_ID
from omuplugin_obssync.types import (
    EVENT_SIGNAL,
    SCENE_GET,
    SCENE_LIST,
    SOURCE_CREATE,
    SOURCE_GET_FROM_NAME,
    SOURCE_GET_FROM_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE,
    SOURCE_UPDATE,
    BlendProperties,
    BrowserSourceData,
    CreateResponse,
    RemoveResponse,
    ScaleProperties,
    SceneGetRequest,
    SceneJson,
    SceneListRequest,
    SceneListResponse,
    SourceGetFromNameRequest,
    SourceGetFromUuidRequest,
    SourceJson,
    SourceListRequest,
    TextSourceData,
    UpdateResponse,
)
from omuplugin_obssync.version import VERSION

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
    if source.type == "browser_source":
        return {
            "type": source.type,
            "name": source.name,
            "data": BrowserSourceData(**source.settings.to_json()),
            "uuid": source.uuid,
            "scene": scene_item.scene.source.name,
            "blend_properties": blend_properties,
            "scale_properties": scale_properties,
        }
    elif source.type == "text_gdiplus":
        return {
            "type": source.type,
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
        scene_item.blending_method = OBSBlendingMethod(blending_method)
        scene_item.blending_mode = OBSBlendingType(blending_mode)
    if "scale_properties" in source_json:
        scale_filter = source_json["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType(scale_filter)
    return scene_item


@omu.endpoints.bind(endpoint_type=SOURCE_CREATE)
async def source_create(source: SourceJson) -> CreateResponse:
    existing_source = OBSSource.get_source_by_name(source["name"])
    if existing_source is not None:
        raise ValueError(f"Source with name {source['name']} already exists")
    scene = get_scene(source.get("scene"))
    scene_item = create_obs_source(scene, source)
    if "blend_properties" in source:
        blending_method = source["blend_properties"]["blending_method"]
        blending_mode = source["blend_properties"]["blending_mode"]
        scene_item.blending_method = OBSBlendingMethod(blending_method)
        scene_item.blending_mode = OBSBlendingType(blending_mode)
    if "scale_properties" in source:
        scale_filter = source["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType(scale_filter)
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {source['type']} is not supported")
    return {"source": source_json}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE)
async def source_remove(source_name: str) -> RemoveResponse:
    obs_source = OBSSource.get_source_by_name(source_name)
    if obs_source is None:
        raise ValueError(f"Source with name {source_name} does not exist")
    if obs_source.removed:
        raise ValueError(f"Source with name {source_name} is already removed")
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
        scene_item.blending_method = OBSBlendingMethod(blending_method)
        scene_item.blending_mode = OBSBlendingType(blending_mode)
    if "scale_properties" in source_json:
        scale_filter = source_json["scale_properties"]["scale_filter"]
        scene_item.scale_filter = OBSScaleType(scale_filter)
    updated_json = source_to_json(scene_item)
    if updated_json is None:
        raise ValueError(f"Source with type {source.type} is not supported")
    return {"source": updated_json}


@omu.endpoints.bind(endpoint_type=SOURCE_GET_FROM_NAME)
async def source_get_from_name(request: SourceGetFromNameRequest) -> SourceJson:
    scene = get_scene(request.get("scene"))
    scene_item = scene.find_source(request["name"])
    if scene_item is None:
        raise ValueError(f"Source with name {request['name']} does not exist")
    source_json = source_to_json(scene_item)
    if source_json is None:
        raise ValueError(f"Source with type {scene_item.source.type} is not supported")
    return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_GET_FROM_UUID)
async def source_get_from_uuid(request: SourceGetFromUuidRequest) -> SourceJson:
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
    scene_items = scene.enum_items()
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


event_signal = omu.signal.get(EVENT_SIGNAL)


@OBS.frontend_add_event_callback
def on_event(event: OBSFrontendEvent):
    loop.create_task(event_signal.notify(event.name))


def start():
    global loop
    loop = asyncio.new_event_loop()
    omu.run(loop=loop)

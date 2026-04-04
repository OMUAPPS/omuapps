from __future__ import annotations

import asyncio
import threading
from collections.abc import Callable
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from queue import Queue

from loguru import logger
from omu.omu import Omu
from omu.token import JsonTokenProvider
from omuplugin_obs.config import Config
from omuplugin_obs.const import PLUGIN_APP
from omuplugin_obs.version import VERSION

from ..obs.data import OBSData
from ..obs.obs import OBS, OBSFrontendEvent
from ..obs.scene import OBSBlendingMethod, OBSBlendingType, OBSScaleType, OBSScene, OBSSceneItem
from ..obs.source import OBSSource, OBSSourceType
from ..types import (
    BROWSER_ADD,
    BROWSER_CREATE,
    EVENT_SIGNAL,
    SCENE_CREATE,
    SCENE_GET_BY_NAME,
    SCENE_GET_BY_UUID,
    SCENE_GET_CURRENT,
    SCENE_LIST,
    SCENE_SET_CURRENT_BY_NAME,
    SCENE_SET_CURRENT_BY_UUID,
    SCREENSHOT_CREATE,
    SCREENSHOT_GET_LAST_BINARY,
    SOURCE_ADD,
    SOURCE_CREATE,
    SOURCE_GET_BY_NAME,
    SOURCE_GET_BY_UUID,
    SOURCE_LIST,
    SOURCE_REMOVE_BY_NAME,
    SOURCE_REMOVE_BY_UUID,
    SOURCE_UPDATE,
    BlendProperties,
    BrowserSource,
    BrowserSourceData,
    CreateBrowserRequest,
    CreateResponse,
    RemoveByNameRequest,
    RemoveByUuidRequest,
    RemoveResponse,
    ScaleProperties,
    SceneCreateRequest,
    SceneCreateResponse,
    SceneGetByNameRequest,
    SceneGetByUuidRequest,
    SceneGetCurrentRequest,
    SceneJson,
    SceneListRequest,
    SceneListResponse,
    SceneSetCurrentByNameRequest,
    SceneSetCurrentByUuidRequest,
    SceneSetCurrentResponse,
    ScreenshotCreateRequest,
    ScreenshotCreateResponse,
    ScreenshotGetLastBinaryRequest,
    ScreenshotGetLastBinaryResponse,
    SourceGetByNameRequest,
    SourceGetByUuidRequest,
    SourceJson,
    SourceListRequest,
    TextSource,
    TextSourceData,
    UpdateResponse,
)

config_result = Config.load()
if config_result.is_err is True:
    raise Exception(f"Loading config failed: {config_result.err}")
config = config_result.value

global loop
loop = asyncio.new_event_loop()
omu = Omu(
    PLUGIN_APP,
    loop=loop,
    address=config.get_server_address(),
    token=JsonTokenProvider(config.get_token_path()),
)


def source_to_json(scene_item: OBSSceneItem) -> SourceJson | None:
    with scene_item.source as source:
        blend_properties = BlendProperties(
            blending_method=scene_item.blending_method.name,
            blending_mode=scene_item.blending_mode.name,
        )
        scale_properties = ScaleProperties(scale_filter=scene_item.scale_filter.name)
        with source.settings as settings:
            settings_json = settings.to_json()
        if source.id == "browser_source":
            return BrowserSource(
                {
                    "type": "browser_source",
                    "name": source.name,
                    "data": BrowserSourceData(**settings_json),
                    "uuid": source.uuid,
                    "scene": scene_item.scene.source.name,
                    "blend_properties": blend_properties,
                    "scale_properties": scale_properties,
                }
            )
        elif source.id == "text_gdiplus":
            return TextSource(
                {
                    "type": "text_gdiplus",
                    "name": source.name,
                    "data": TextSourceData(**settings_json),
                    "uuid": source.uuid,
                    "scene": scene_item.scene.source.name,
                    "blend_properties": blend_properties,
                    "scale_properties": scale_properties,
                }
            )
        else:
            return None


@contextmanager
def get_scene(scene_name: str | None):
    if scene_name:
        with OBSScene.get_scene_by_name(scene_name) as scene:
            if scene is None:
                raise ValueError(f"Scene with name {scene_name} does not exist")
            yield scene
        return
    else:
        with OBS.frontend_get_current_scene() as current_scene:
            if current_scene is None:
                raise ValueError("No current scene")
            with OBS.get_scene_from_source(current_scene) as scene:
                yield scene
        return


def get_unique_name(name: str) -> str:
    with OBSSource.get_source_by_name(name) as existing_source:
        if existing_source is None:
            return name
        else:
            removed = existing_source.removed
            if removed:
                return name
    i = 2
    while True:
        new_name = f"{name} ({i})"
        with OBSSource.get_source_by_name(new_name) as existing_source:
            if existing_source is None:
                return new_name
            i += 1


@contextmanager
def create_obs_source(scene: OBSScene, source_json: SourceJson):
    if "uuid" in source_json:
        raise NotImplementedError("uuid is not supported yet")
    with OBSData.from_json(dict(source_json.get("data", {}))) as settings:
        if source_json["type"] not in {
            "browser_source",
            "text_gdiplus",
        }:
            raise ValueError(f"Source with type {source_json['type']} is not allowed")
        with OBSSource.create(
            source_json["type"],
            source_json["name"],
            settings,
        ) as obs_source:
            with scene.add(obs_source) as scene_item:
                if "blend_properties" in source_json:
                    blending_method = source_json["blend_properties"]["blending_method"]
                    blending_mode = source_json["blend_properties"]["blending_mode"]
                    scene_item.blending_method = OBSBlendingMethod[blending_method]
                    scene_item.blending_mode = OBSBlendingType[blending_mode]
                if "scale_properties" in source_json:
                    scale_filter = source_json["scale_properties"]["scale_filter"]
                    scene_item.scale_filter = OBSScaleType[scale_filter]
                yield scene_item


def to_async[**P, T](func: Callable[P, T]):
    async def async_func(*args: P.args, **kwargs: P.kwargs) -> T:
        def callback():
            return func(*args, **kwargs)

        result = await enqueue(callback)
        return result

    return async_func


@omu.endpoints.bind(endpoint_type=SOURCE_CREATE)
@to_async
def source_create(source: SourceJson) -> CreateResponse:
    with OBSSource.get_source_by_name(source["name"]) as existing_source:
        if existing_source is not None:
            if not existing_source.removed:
                raise ValueError(f"Source with name {source['name']} already exists")
    with get_scene(source.get("scene")) as scene:
        with create_obs_source(scene, source) as scene_item:
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
@to_async
def source_add(source: SourceJson) -> CreateResponse:
    source["name"] = get_unique_name(source["name"])
    with get_scene(source.get("scene")) as scene:
        with create_obs_source(scene, source) as scene_item:
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


def calculate_dimensions(scene: OBSScene, width: int | str, height: int | str) -> tuple[int, int]:
    scene_width = scene.source.base_width
    scene_height = scene.source.base_height
    # 100:% = full width/height of the scene
    # 100:vw = full width of the scene
    # 100:vh = full height of the scene
    # 100:px = 100 pixels
    # 100 = raise ValueError
    if isinstance(width, int):
        width = int(width)
    elif isinstance(width, str):
        if width.count(":") != 1:
            raise ValueError(f"Invalid width format: {width}")
        num, unit = width.split(":")
        if unit == "%":
            width = int(num) * scene_width // 100
        elif unit == "vw":
            width = int(num) * scene_width // 100
        elif unit == "vh":
            width = int(num) * scene_height // 100
        elif unit == "px":
            width = int(num)
        else:
            raise ValueError(f"Unknown unit {unit} in width {width}")
    else:
        raise ValueError(f"Invalid width format: {width}")
    if isinstance(height, int):
        height = int(height)
    elif isinstance(height, str):
        if height.count(":") != 1:
            raise ValueError(f"Invalid height format: {height}")
        num, unit = height.split(":")
        if unit == "%":
            height = int(num) * scene_height // 100
        elif unit == "vw":
            height = int(num) * scene_width // 100
        elif unit == "vh":
            height = int(num) * scene_height // 100
        elif unit == "px":
            height = int(num)
        else:
            raise ValueError(f"Unknown unit {unit} in height {height}")
    else:
        raise ValueError(f"Invalid height format: {height}")
    return width, height


@omu.endpoints.bind(endpoint_type=BROWSER_CREATE)
@to_async
def browser_create(browser_source: CreateBrowserRequest) -> CreateResponse:
    with OBSSource.get_source_by_name(browser_source["name"]) as existing_source:
        if existing_source is not None:
            if not existing_source.removed:
                raise ValueError(f"Source with name {browser_source['name']} already exists")
        with get_scene(browser_source.get("scene")) as scene:
            scene_width = scene.source.base_width
            scene_height = scene.source.base_height
            width, height = calculate_dimensions(
                scene,
                browser_source.get("width", scene_width),
                browser_source.get("height", scene_height),
            )
            obs_data = {
                "url": browser_source["url"],
                "width": width,
                "height": height,
                "css": browser_source.get("css"),
            }
            with OBSData.from_json(obs_data) as obs_data_settings:
                with OBSSource.create(
                    "browser_source",
                    browser_source["name"],
                    obs_data_settings,
                ) as obs_source:
                    with scene.add(obs_source) as scene_item:
                        if "blend_properties" in browser_source:
                            blending_method = browser_source["blend_properties"]["blending_method"]
                            blending_mode = browser_source["blend_properties"]["blending_mode"]
                            scene_item.blending_method = OBSBlendingMethod[blending_method]
                            scene_item.blending_mode = OBSBlendingType[blending_mode]
                        if "scale_properties" in browser_source:
                            scale_filter = browser_source["scale_properties"]["scale_filter"]
                            scene_item.scale_filter = OBSScaleType[scale_filter]
                        source_json = source_to_json(scene_item)
                        if source_json is None:
                            raise ValueError("Source with type browser_source is not supported")
                        return {"source": source_json}


@omu.endpoints.bind(endpoint_type=BROWSER_ADD)
@to_async
def browser_add(browser_source: CreateBrowserRequest) -> CreateResponse:
    browser_source["name"] = get_unique_name(browser_source["name"])
    with get_scene(browser_source.get("scene")) as scene:
        scene_width = scene.source.base_width
        scene_height = scene.source.base_height
        width, height = calculate_dimensions(
            scene,
            browser_source.get("width", scene_width),
            browser_source.get("height", scene_height),
        )
        obs_data = {
            "url": browser_source["url"],
            "width": width,
            "height": height,
            "css": browser_source.get("css"),
        }
        with OBSData.from_json(obs_data) as obs_data_settings:
            with OBSSource.create(
                "browser_source",
                browser_source["name"],
                obs_data_settings,
            ) as obs_source:
                with scene.add(obs_source) as scene_item:
                    if "blend_properties" in browser_source:
                        blending_method = browser_source["blend_properties"]["blending_method"]
                        blending_mode = browser_source["blend_properties"]["blending_mode"]
                        scene_item.blending_method = OBSBlendingMethod[blending_method]
                        scene_item.blending_mode = OBSBlendingType[blending_mode]
                    if "scale_properties" in browser_source:
                        scale_filter = browser_source["scale_properties"]["scale_filter"]
                        scene_item.scale_filter = OBSScaleType[scale_filter]
                    source_json = source_to_json(scene_item)
                    if source_json is None:
                        raise ValueError("Source with type browser_source is not supported")
                    return {"source": source_json}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE_BY_NAME)
@to_async
def source_remove_by_name(request: RemoveByNameRequest) -> RemoveResponse:
    with OBSSource.get_source_by_name(request["name"]) as obs_source:
        if obs_source is None:
            raise ValueError(f"Source with name {request['name']} does not exist")
        if obs_source.removed:
            raise ValueError(f"Source with name {request['name']} is already removed")
        obs_source.remove()
        return {}


@omu.endpoints.bind(endpoint_type=SOURCE_REMOVE_BY_UUID)
@to_async
def source_remove_by_uuid(request: RemoveByUuidRequest) -> RemoveResponse:
    with OBSSource.get_source_by_uuid(request["uuid"]) as source:
        if source is None:
            raise ValueError(f"Source with uuid {request['uuid']} does not exist")
        if source.removed:
            raise ValueError(f"Source with uuid {request['uuid']} is already removed")
        source.remove()
        return {}


@omu.endpoints.bind(endpoint_type=SOURCE_UPDATE)
@to_async
def source_update(source_json: SourceJson) -> UpdateResponse:
    if "uuid" in source_json:
        source = OBSSource.get_source_by_uuid(source_json["uuid"])
    else:
        source = OBSSource.get_source_by_name(source_json["name"])

    with source as source:
        if source is None:
            raise ValueError(f"Source with query {source_json} does not exist")
        with OBSData.from_json(dict(source_json["data"])) as new_data:
            source.settings.apply(new_data)

        with get_scene(source_json.get("scene")) as scene:
            with scene.sceneitem_from_source(source) as scene_item:
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
@to_async
def source_get_by_name(request: SourceGetByNameRequest) -> SourceJson:
    with get_scene(request.get("scene")) as scene:
        with scene.find_source(request["name"]) as scene_item:
            if scene_item is None:
                raise ValueError(f"Source with name {request['name']} does not exist")
            source_json = source_to_json(scene_item)
            if source_json is None:
                raise ValueError(f"Source with type {scene_item.source.id} is not supported")
            return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_GET_BY_UUID)
@to_async
def source_get_by_uuid(request: SourceGetByUuidRequest) -> SourceJson:
    with get_scene(request.get("scene")) as scene:
        with OBSSource.get_source_by_uuid(request["uuid"]) as source:
            if source is None:
                raise ValueError(f"Source with uuid {request['uuid']} does not exist")
            with scene.sceneitem_from_source(source) as scene_item:
                if scene_item is None:
                    raise ValueError(f"Source with uuid {request['uuid']} exist but can't get scene item")
                source_json = source_to_json(scene_item)
                if source_json is None:
                    raise ValueError(f"Source with type {source.type} is not supported")
                return source_json


@omu.endpoints.bind(endpoint_type=SOURCE_LIST)
@to_async
def source_list(request: SourceListRequest) -> list[SourceJson]:
    with get_scene(request.get("scene")) as scene:
        scene_items = scene.enum_items()
        sources = []
        for scene_item in scene_items:
            source_json = source_to_json(scene_item)
            if source_json is not None:
                sources.append(source_json)
        return sources


def scene_to_json(scene: OBSScene) -> SceneJson:
    sources = []
    for scene_item in scene.enum_items():
        source_json = source_to_json(scene_item)
        if source_json is not None:
            sources.append(source_json)
    return {
        "name": scene.source.name,
        "uuid": scene.source.uuid,
        "sources": sources,
    }


@omu.endpoints.bind(endpoint_type=SCENE_LIST)
@to_async
def scene_list(request: SceneListRequest) -> SceneListResponse:
    scenes = OBS.get_scenes()
    scene_jsons: SceneListResponse = {"scenes": [scene_to_json(scene) for scene in scenes]}
    return scene_jsons


@omu.endpoints.bind(endpoint_type=SCENE_GET_BY_NAME)
@to_async
def scene_get_by_name(request: SceneGetByNameRequest) -> SceneJson:
    with get_scene(request["name"]) as scene:
        scene_json = scene_to_json(scene)
        return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_GET_BY_UUID)
@to_async
def scene_get_by_uuid(request: SceneGetByUuidRequest) -> SceneJson:
    with OBSSource.get_source_by_uuid(request["uuid"]) as source:
        if source is None:
            raise ValueError(f"Source with uuid {request['uuid']} does not exist")
        if source.type != OBSSourceType.SCENE:
            raise ValueError(f"Source with uuid {request['uuid']} is not a scene")
        with source.scene as scene:
            scene_json = scene_to_json(scene)
            return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_GET_CURRENT)
@to_async
def scene_get_current(request: SceneGetCurrentRequest) -> SceneJson:
    with get_scene(request.get("scene")) as scene:
        scene_json = scene_to_json(scene)
        return scene_json


@omu.endpoints.bind(endpoint_type=SCENE_SET_CURRENT_BY_NAME)
@to_async
def scene_set_current_by_name(
    request: SceneSetCurrentByNameRequest,
) -> SceneSetCurrentResponse:
    with OBSScene.get_scene_by_name(request["name"]) as scene:
        if scene is None:
            raise ValueError(f"Scene with name {request['name']} does not exist")
        OBS.frontend_set_current_scene(scene)
        return {}


@omu.endpoints.bind(endpoint_type=SCENE_SET_CURRENT_BY_UUID)
@to_async
def scene_set_current_by_uuid(
    request: SceneSetCurrentByUuidRequest,
) -> SceneSetCurrentResponse:
    with OBSSource.get_source_by_uuid(request["uuid"]) as source:
        if source is None:
            raise ValueError(f"Source with uuid {request['uuid']} does not exist")
        if not source.is_scene:
            raise ValueError(f"Source with uuid {request['uuid']} is not a scene")
        with source.scene as scene:
            if scene is None:
                raise ValueError(f"Scene with uuid {request['uuid']} does not exist")
            OBS.frontend_set_current_scene(scene)
        return {}


@omu.endpoints.bind(endpoint_type=SCENE_CREATE)
@to_async
def scene_create(request: SceneCreateRequest) -> SceneCreateResponse:
    with OBSScene.get_scene_by_name(request["name"]) as scene:
        if scene is not None:
            raise ValueError(f"Scene with name {request['name']} already exists")
    with OBSScene.create(request["name"]) as scene:
        response: SceneCreateResponse = {
            "scene": {
                "name": scene.source.name,
                "uuid": scene.source.uuid,
                "sources": [],
            }
        }
        return response


@omu.endpoints.bind(endpoint_type=SCREENSHOT_CREATE)
@to_async
def screenshot_create(request: ScreenshotCreateRequest) -> ScreenshotCreateResponse:
    OBS.frontend_take_screenshot()
    return {}


@omu.endpoints.bind(endpoint_type=SCREENSHOT_GET_LAST_BINARY)
@to_async
def screenshot_get_last_binary(request: ScreenshotGetLastBinaryRequest) -> ScreenshotGetLastBinaryResponse:
    screenshot_path = OBS.frontend_get_last_screenshot()
    if screenshot_path is None:
        return ScreenshotGetLastBinaryResponse(None)
    try:
        return ScreenshotGetLastBinaryResponse(screenshot_path.read_bytes())
    except Exception as e:
        logger.error(f"Failed to read screenshot: {e}")
        return ScreenshotGetLastBinaryResponse(None)


event_signal = omu.signals.get(EVENT_SIGNAL)


@OBS.frontend_add_event_callback
def on_event(event: OBSFrontendEvent):
    loop.create_task(event_signal.notify(event.name))


@omu.network.event.connected.listen
async def on_connected():
    logger.info(f"Coneected to {omu.network.address.host}:{omu.network.address.port}")
    print(f"[OMUAPPS] Connected to {omu.network.address.host}:{omu.network.address.port}")


@omu.on_ready
async def on_ready():
    logger.info(f"OBS Plugin {VERSION} is ready!")
    print(f"[OMUAPPS] OBS Plugin {VERSION} is ready!")


_LOOP: asyncio.AbstractEventLoop | None = None
_THREAD: threading.Thread | None = None


@dataclass(frozen=True)
class Task:
    future: asyncio.Future  # P, T のジェネリクスは一旦省略
    run: Callable
    loop: asyncio.AbstractEventLoop  # 呼び出し元のループを保持


# 2. enqueue 関数を修正
async def enqueue(callback: Callable):
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    # タスクをキューに入れる（ここには元のループ情報も含める）
    task = Task(future=future, run=callback, loop=loop)
    _QUEUE.put(task)
    return await future


# 3. process_task (OBSメインスレッド) を修正
def process_task():
    while not _QUEUE.empty():
        task = _QUEUE.get_nowait()
        try:
            result = task.run()
            # 呼び出し元(omu)のループに対してスレッドセーフに結果をセット
            task.loop.call_soon_threadsafe(task.future.set_result, result)
        except Exception as e:
            # エラー時もスレッドセーフに例外をセット
            task.loop.call_soon_threadsafe(task.future.set_exception, e)


_QUEUE = Queue[Task]()


def setup_obs_plugin():
    logger.info(f"Setting up OBS Plugin v{VERSION} at {Path.cwd()}")
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
    _THREAD = threading.Thread(None, setup_obs_plugin, daemon=True)
    _THREAD.start()

    OBS.timer_add(process_task, 100)


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
        _LOOP.call_soon_threadsafe(lambda loop: loop.stop(), _LOOP)

    if _THREAD is not None:
        _THREAD.join(timeout=5)
        _THREAD = None

    OBS.timer_remove(process_task)


async def stop_omu():
    await omu.stop()
    print("OBS Plugin is stopped")


omu.network.event.disconnected += stop_omu

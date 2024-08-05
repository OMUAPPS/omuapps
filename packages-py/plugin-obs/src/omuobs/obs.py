from __future__ import annotations

from collections.abc import Callable, Iterable
from enum import IntEnum

import obspython  # type: ignore

from .scene import OBSScene
from .source import OBSSource


class OBSFrontendEvent(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/UI/obs-frontend-api/obs-frontend-api.h#L16-L65
    STREAMING_STARTING = 0
    STREAMING_STARTED = 1
    STREAMING_STOPPING = 2
    STREAMING_STOPPED = 3
    RECORDING_STARTING = 4
    RECORDING_STARTED = 5
    RECORDING_STOPPING = 6
    RECORDING_STOPPED = 7
    SCENE_CHANGED = 8
    SCENE_LIST_CHANGED = 9
    TRANSITION_CHANGED = 10
    TRANSITION_STOPPED = 11
    TRANSITION_LIST_CHANGED = 12
    SCENE_COLLECTION_CHANGED = 13
    SCENE_COLLECTION_LIST_CHANGED = 14
    PROFILE_CHANGED = 15
    PROFILE_LIST_CHANGED = 16
    EXIT = 17
    REPLAY_BUFFER_STARTING = 18
    REPLAY_BUFFER_STARTED = 19
    REPLAY_BUFFER_STOPPING = 20
    REPLAY_BUFFER_STOPPED = 21
    STUDIO_MODE_ENABLED = 22
    STUDIO_MODE_DISABLED = 23
    PREVIEW_SCENE_CHANGED = 24
    SCENE_COLLECTION_CLEANUP = 25
    FINISHED_LOADING = 26
    RECORDING_PAUSED = 27
    RECORDING_UNPAUSED = 28
    TRANSITION_DURATION_CHANGED = 29
    REPLAY_BUFFER_SAVED = 30
    VIRTUALCAM_STARTED = 31
    VIRTUALCAM_STOPPED = 32
    TBAR_VALUE_CHANGED = 33
    SCENE_COLLECTION_CHANGING = 34
    PROFILE_CHANGING = 35
    SCRIPTING_SHUTDOWN = 36
    PROFILE_RENAMED = 37
    SCENE_COLLECTION_RENAMED = 38
    THEME_CHANGED = 39
    SCREENSHOT_TAKEN = 40


class OBS:
    @staticmethod
    def frontend_get_current_scene() -> OBSSource:
        obs_source = obspython.obs_frontend_get_current_scene()
        return OBSSource(obs_source)

    @staticmethod
    def frontend_get_scene_collections() -> list[str]:
        scene_collections = obspython.obs_frontend_get_scene_collections()
        return scene_collections

    @staticmethod
    def frontend_get_scene_names() -> list[str]:
        scene_names = obspython.obs_frontend_get_scene_names()
        return scene_names

    @staticmethod
    def get_scenes() -> list[OBSScene]:
        scenes = []
        for scene_name in OBS.frontend_get_scene_names():
            scene = OBSScene.get_scene_by_name(scene_name)
            if scene is not None:
                scenes.append(scene)
        return scenes

    @staticmethod
    def enum_sources() -> Iterable[OBSSource]:
        items = obspython.obs_enum_sources()  # type: ignore
        for item in items:
            yield OBSSource(item)
        obspython.source_list_release(items)

    @staticmethod
    def frontend_add_event_callback(callback: Callable[[OBSFrontendEvent], None]):
        def obs_callback(event):
            callback(OBSFrontendEvent(event))

        # obspython.obs_frontend_add_event_callback(obs_callback)  # type: ignore

from __future__ import annotations

import obspython

from .scene import OBSScene
from .source import OBSSource


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

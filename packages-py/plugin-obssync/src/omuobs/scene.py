from __future__ import annotations

from typing import TYPE_CHECKING

import obspython  # type: ignore

from .reference import Reference

if TYPE_CHECKING:
    from .source import OBSSource


class obs_scene_t: ...


class OBSScene(Reference[obs_scene_t]):
    def __init__(self, obs_scene: obs_scene_t):
        super().__init__(
            release=obspython.obs_scene_release,
            ref=obs_scene,
        )

    @classmethod
    def create(cls, name: str) -> OBSScene:
        existing_scene = cls.get_scene_by_name(name)
        if existing_scene is not None:
            raise ValueError(f"Scene with name {name} already exists")
        obs_scene = obspython.obs_scene_create(name)
        return cls(obs_scene)

    @classmethod
    def create_private(cls, name: str | None = None) -> OBSScene:
        obs_scene = obspython.obs_scene_create_private(name)
        return cls(obs_scene)

    @classmethod
    def get_scene_by_name(cls, name: str) -> OBSScene | None:
        obs_scene = obspython.obs_get_scene_by_name(name)
        if obs_scene is None:
            return None
        return cls(obs_scene)

    @property
    def source(self) -> OBSSource:
        with self as scene:
            obs_source = obspython.obs_scene_get_source(scene)
        from .source import OBSSource

        return OBSSource(obs_source)

    def add(self, source: OBSSource):
        with self as scene, source as src:
            obspython.obs_scene_add(scene, src)

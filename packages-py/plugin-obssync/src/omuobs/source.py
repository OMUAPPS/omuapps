from __future__ import annotations

from typing import TYPE_CHECKING

import obspython  # type: ignore

from .data import OBSData, OBSDataArray
from .reference import Reference

if TYPE_CHECKING:
    from .scene import OBSScene


class obs_source_t: ...


class OBSSource(Reference[obs_source_t]):
    def __init__(self, obs_source: obs_source_t):
        super().__init__(
            release=obspython.obs_source_release,
            ref=obs_source,
        )

    @classmethod
    def create(
        cls,
        type: str,
        name: str,
        settings: OBSData | None = None,
        hotkey_data: OBSData | None = None,
    ) -> OBSSource:
        existing_source = cls.get_source_by_name(name)
        if existing_source is not None:
            raise ValueError(f"Source with name {name} already exists")
        settings_data = None
        hotkey_data_data = None
        if settings is not None:
            with settings as settings_data:
                settings_data = settings_data
        if hotkey_data is not None:
            with hotkey_data as hotkey_data_data:
                hotkey_data_data = hotkey_data_data
        obs_source = obspython.obs_source_create(
            type, name, settings_data, hotkey_data_data
        )
        if obs_source is None:
            raise ValueError("Failed to create source")
        return cls(obs_source)

    @classmethod
    def create_private(
        cls,
        type: str,
        name: str,
        settings: OBSData | None = None,
    ) -> OBSSource:
        settings_data = None
        if settings is not None:
            with settings as settings_data:
                settings_data = settings_data
        obs_source = obspython.obs_source_create_private(type, name, settings_data)
        if obs_source is None:
            raise ValueError("Failed to create source")
        return cls(obs_source)

    @classmethod
    def get_source_by_name(cls, name: str) -> OBSSource | None:
        obs_source = obspython.obs_get_source_by_name(name)
        if obs_source is None:
            return None
        return cls(obs_source)

    @property
    def name(self) -> str:
        with self as source:
            return obspython.obs_source_get_name(source)

    @property
    def type(self) -> str:
        with self as source:
            return obspython.obs_source_get_type(source)

    @property
    def settings(self) -> OBSData:
        with self as source:
            obs_data = obspython.obs_source_get_settings(source)
        return OBSData(obs_data)

    @property
    def filters(self) -> OBSDataArray:
        with self as source:
            obs_data_array = obspython.obs_source_backup_filters(source)
        return OBSDataArray(obs_data_array)

    @property
    def scene(self) -> OBSScene:
        with self as source:
            obs_scene = obspython.obs_scene_from_source(source)
        from .scene import OBSScene

        return OBSScene(obs_scene)


class obs_frontend_source_list(list[obs_source_t]): ...


class OBSSourceList(Reference[obs_frontend_source_list]):
    def __init__(self, obs_source_list: obs_frontend_source_list):
        super().__init__(
            release=obspython.source_list_release,
            ref=obs_source_list,
        )

    def __iter__(self):
        with self as source_list:
            for obs_source in source_list:
                yield OBSSource(obs_source)

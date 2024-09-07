from __future__ import annotations

from collections.abc import Iterable
from enum import IntEnum
from typing import TYPE_CHECKING

import obspython  # type: ignore

from .data import OBSData, OBSDataArray
from .reference import Reference

if TYPE_CHECKING:
    from .source import OBSSource


class OBSOrderMovement(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L102-L107

    UP = 0
    DOWN = 1
    TOP = 2
    BOTTOM = 3


class OBSBoundsType(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L148-L156

    NONE = 0  # no bounds
    STRETCH = 0  # stretch (ignores base scale)
    SCALE_INNER = 0  # scales to inner rectangle
    SCALE_OUTER = 0  # scales to outer rectangle
    SCALE_TO_WIDTH = 0  # scales to the width
    SCALE_TO_HEIGHT = 0  # scales to the height
    MAX_ONLY = 0  # no scaling, maximum size only


class OBSScaleType(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L119-L126
    DISABLE = 0
    POINT = 1
    BICUBIC = 2
    BILINEAR = 3
    LANCZOS = 4
    AREA = 5


class OBSBlendingMethod(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L128-L131
    DEFAULT = 0
    SRGB_OFF = 1


class OBSBlendingType(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L133-L141
    NORMAL = 0
    ADDITIVE = 1
    SUBTRACT = 2
    SCREEN = 3
    MULTIPLY = 4
    LIGHTEN = 5
    DARKEN = 6


class obs_sceneitem_t: ...


class OBSSceneItem(Reference[obs_sceneitem_t]):
    def __init__(self, obs_sceneitem: obs_sceneitem_t):
        super().__init__(
            release=obspython.obs_sceneitem_release,
            ref=obs_sceneitem,
        )

    def save(self, arr: OBSDataArray) -> None:
        with self as scene_item, arr as arr_data:
            obspython.obs_sceneitem_save(scene_item, arr_data)

    @property
    def id(self) -> None:
        with self as scene_item:
            return obspython.obs_sceneitem_get_id(scene_item)

    @id.setter
    def id(self, value: int) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_id(scene_item, value)

    @property
    def order_position(self) -> int:
        with self as scene_item:
            return obspython.obs_sceneitem_get_order_position(scene_item)

    @property
    def scene(self) -> OBSScene:
        with self as scene_item:
            obs_scene = obspython.obs_sceneitem_get_scene(scene_item)
        from .scene import OBSScene

        return OBSScene(obs_scene)

    @property
    def source(self) -> OBSSource:
        with self as scene_item:
            obs_source = obspython.obs_sceneitem_get_source(scene_item)
        from .source import OBSSource

        return OBSSource(obs_source)

    def select(self, selected: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_select(scene_item, selected)

    @property
    def selected(self) -> bool:
        with self as scene_item:
            return obspython.obs_sceneitem_selected(scene_item)

    @selected.setter
    def selected(self, value: bool) -> None:
        self.select(value)

    @property
    def locked(self) -> bool:
        with self as scene_item:
            return obspython.obs_sceneitem_locked(scene_item)

    @locked.setter
    def locked(self, value: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_locked(scene_item, value)

    def set_pos(self, vec2: obspython.vec2) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_pos(scene_item, vec2)

    def set_rot(self, rot: float) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_rot(scene_item, rot)

    def set_scale(self, vec2: obspython.vec2) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_scale(scene_item, vec2)

    # set_alignment

    def set_order(self, order: OBSOrderMovement) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_order(scene_item, order)

    def set_order_position(self, position: int) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_order_position(scene_item, position)

    def set_bounds_type(self, bounds_type: OBSBoundsType) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_bounds_type(scene_item, bounds_type)

    def set_bounds_crop(self, crop: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_bounds_crop(scene_item, crop)

    def set_bounds(self, bounds: obspython.vec2) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_bounds(scene_item, bounds)

    def get_id(self) -> int:
        with self as scene_item:
            return obspython.obs_sceneitem_get_id(scene_item)

    def get_pos(self) -> obspython.vec2:
        pos = obspython.vec2()
        with self as scene_item:
            obspython.obs_sceneitem_get_pos(scene_item, pos)
        return pos

    def get_rot(self) -> float:
        with self as scene_item:
            return obspython.obs_sceneitem_get_rot(scene_item)

    def get_scale(self) -> obspython.vec2:
        scale = obspython.vec2()
        with self as scene_item:
            obspython.obs_sceneitem_get_scale(scene_item, scale)
        return scale

    # get_alignment

    def get_bounds_type(self) -> OBSBoundsType:
        with self as scene_item:
            return obspython.obs_sceneitem_get_bounds_type(scene_item)

    # get_bounds_alignment

    def get_bounds_crop(self) -> bool:
        with self as scene_item:
            return obspython.obs_sceneitem_get_bounds_crop(scene_item)

    def get_bounds(self) -> obspython.vec2:
        bounds = obspython.vec2()
        with self as scene_item:
            obspython.obs_sceneitem_get_bounds(scene_item, bounds)
        return bounds

    def get_info(self) -> obspython.obs_transform_info:
        info = obspython.obs_transform_info()
        with self as scene_item:
            obspython.obs_sceneitem_get_info(scene_item, info)
        return info

    def set_info(self, info: obspython.obs_transform_info) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_info(scene_item, info)

    def get_info2(self) -> obspython.obs_transform_info:
        info = obspython.obs_transform_info()
        with self as scene_item:
            obspython.obs_sceneitem_get_info2(scene_item, info)
        return info

    def set_info2(self, info: obspython.obs_transform_info) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_info2(scene_item, info)

    def get_draw_transform(self) -> obspython.matrix4:
        matrix = obspython.matrix4()
        with self as scene_item:
            obspython.obs_sceneitem_get_draw_transform(scene_item, matrix)
        return matrix

    def get_box_transform(self) -> obspython.matrix4:
        matrix = obspython.matrix4()
        with self as scene_item:
            obspython.obs_sceneitem_get_box_transform(scene_item, matrix)
        return matrix

    def get_box_scale(self) -> obspython.vec2:
        scale = obspython.vec2()
        with self as scene_item:
            obspython.obs_sceneitem_get_box_scale(scene_item, scale)
        return scale

    @property
    def visible(self) -> bool:
        with self as scene_item:
            return obspython.obs_sceneitem_visible(scene_item)

    @visible.setter
    def visible(self, value: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_visible(scene_item, value)

    @property
    def crop(self) -> obspython.obs_sceneitem_crop:
        crop = obspython.obs_sceneitem_crop()
        with self as scene_item:
            obspython.obs_sceneitem_get_crop(scene_item, crop)
        return crop

    @crop.setter
    def crop(self, crop: obspython.obs_sceneitem_crop) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_crop(scene_item, crop)

    @property
    def scale_filter(self) -> OBSScaleType:
        with self as scene_item:
            return OBSScaleType(obspython.obs_sceneitem_get_scale_filter(scene_item))

    @scale_filter.setter
    def scale_filter(self, value: OBSScaleType) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_scale_filter(scene_item, value)

    @property
    def blending_method(self) -> OBSBlendingMethod:
        with self as scene_item:
            return OBSBlendingMethod(
                obspython.obs_sceneitem_get_blending_method(scene_item)
            )

    @blending_method.setter
    def blending_method(self, value: OBSBlendingMethod) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_blending_method(scene_item, value)

    @property
    def blending_mode(self) -> OBSBlendingType:
        with self as scene_item:
            return OBSBlendingType(
                obspython.obs_sceneitem_get_blending_mode(scene_item)
            )

    @blending_mode.setter
    def blending_mode(self, value: OBSBlendingType) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_blending_mode(scene_item, value)

    def force_update_transform(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_force_update_transform(scene_item)

    def defer_update_begin(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_defer_update_begin(scene_item)

    def defer_update_end(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_defer_update_end(scene_item)

    @property
    def private_settings(self) -> OBSData:
        with self as scene_item:
            obs_data = obspython.obs_sceneitem_get_private_settings(scene_item)
        return OBSData(obs_data)

    @property
    def is_group(self) -> bool:
        with self as scene_item:
            return obspython.obs_sceneitem_is_group(scene_item)

    @property
    def group_get_scene(self) -> OBSScene:
        with self as scene_item:
            obs_scene = obspython.obs_sceneitem_group_get_scene(scene_item)
        from .scene import OBSScene

        return OBSScene(obs_scene)

    def group_ungroup(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_group_ungroup(scene_item)

    def group_ungroup2(self, signal: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_group_ungroup2(scene_item, signal)

    def group_add_item(self, item: OBSSceneItem) -> None:
        with self as scene_item, item as item_data:
            obspython.obs_sceneitem_group_add_item(scene_item, item_data)

    def group_remove_item(self, item: OBSSceneItem) -> None:
        with self as scene_item, item as item_data:
            obspython.obs_sceneitem_group_remove_item(scene_item, item_data)

    def get_group(self, scene: OBSScene) -> OBSSceneItem:
        with self as scene_item, scene as scene_data:
            obs_sceneitem = obspython.obs_sceneitem_get_group(scene_data, scene_item)
        return OBSSceneItem(obs_sceneitem)

    # group_enum_items

    def defer_group_resize_begin(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_defer_group_resize_begin(scene_item)

    def defer_group_resize_end(self) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_defer_group_resize_end(scene_item)

    def set_show_transition(self, source: OBSSource) -> None:
        with self as scene_item, source as source_data:
            obspython.obs_sceneitem_set_show_transition(scene_item, source_data)

    def set_show_transition_duration(self, duration: int) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_show_transition_duration(scene_item, duration)

    def get_show_transition(self) -> OBSSource:
        with self as scene_item:
            obs_source = obspython.obs_sceneitem_get_show_transition(scene_item)
        from .source import OBSSource

        return OBSSource(obs_source)

    def get_show_transition_duration(self) -> int:
        with self as scene_item:
            return obspython.obs_sceneitem_get_show_transition_duration(scene_item)

    def set_hide_transition(self, source: OBSSource) -> None:
        with self as scene_item, source as source_data:
            obspython.obs_sceneitem_set_hide_transition(scene_item, source_data)

    def set_hide_transition_duration(self, duration: int) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_hide_transition_duration(scene_item, duration)

    def get_hide_transition(self) -> OBSSource:
        with self as scene_item:
            obs_source = obspython.obs_sceneitem_get_hide_transition(scene_item)
        from .source import OBSSource

        return OBSSource(obs_source)

    def get_hide_transition_duration(self) -> int:
        with self as scene_item:
            return obspython.obs_sceneitem_get_hide_transition_duration(scene_item)

    def set_transition(self, show: bool, transition: OBSSource) -> None:
        with self as scene_item, transition as transition_data:
            obspython.obs_sceneitem_set_transition(scene_item, show, transition_data)

    def get_transition(self, show: bool) -> OBSSource:
        with self as scene_item:
            obs_source = obspython.obs_sceneitem_get_transition(scene_item, show)
        from .source import OBSSource

        return OBSSource(obs_source)

    def set_transition_duration(self, show: bool, duration: int) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_set_transition_duration(scene_item, show, duration)

    def get_transition_duration(self, show: bool) -> int:
        with self as scene_item:
            return obspython.obs_sceneitem_get_transition_duration(scene_item, show)

    def do_transition(self, visible: bool) -> None:
        with self as scene_item:
            obspython.obs_sceneitem_do_transition(scene_item, visible)

    # transition_load

    # transition_save


class OBSSceneDuplicateType(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L1737-L1742
    REFS = 0
    COPY = 1
    PRIVATE_REFS = 2
    PRIVATE_COPY = 3


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

    @classmethod
    def from_source(cls, source: OBSSource) -> OBSScene:
        obs_scene = obspython.obs_scene_from_source(source)
        return cls(obs_scene)

    def duplicate(self, name: str, duplicate_type: OBSSceneDuplicateType) -> OBSScene:
        obs_scene = obspython.obs_scene_duplicate(self, name, duplicate_type.value)
        return OBSScene(obs_scene)

    def find_source(self, name: str) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_find_source(scene, name)
        return OBSSceneItem(obs_sceneitem)

    def find_source_recursive(self, name: str) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_find_source_recursive(scene, name)
        return OBSSceneItem(obs_sceneitem)

    def find_sceneitem_by_id(self, id: int) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_find_sceneitem_by_id(scene, id)
        return OBSSceneItem(obs_sceneitem)

    def enum_items(self) -> Iterable[OBSSceneItem]:
        with self as scene:
            items = obspython.obs_scene_enum_items(scene)  # type: ignore
            for item in items:
                yield OBSSceneItem(item)
            obspython.source_list_release(items)

    def obs_scene_reorder_items(self, order: list[OBSSceneItem]) -> None:
        with self as scene:
            obspython.obs_scene_reorder_items(scene, order, len(order))

    # obs_scene_reorder_items2

    @property
    def source(self) -> OBSSource:
        with self as scene:
            obs_source = obspython.obs_scene_get_source(scene)
        from .source import OBSSource

        return OBSSource(obs_source)

    def add_group(self, name: str) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_add_group(scene, name)
        return OBSSceneItem(obs_sceneitem)

    def insert_group(self, name: str, items: list[OBSSceneItem]) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_insert_group(
                scene, name, items, len(items)
            )
        return OBSSceneItem(obs_sceneitem)

    def add_group2(self, name: str, signal: bool) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_add_group2(scene, name, signal)
        return OBSSceneItem(obs_sceneitem)

    def insert_group2(
        self, name: str, items: list[OBSSceneItem], signal: bool
    ) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_insert_group2(
                scene, name, items, len(items), signal
            )
        return OBSSceneItem(obs_sceneitem)

    def get_group(self, name: str) -> OBSSceneItem:
        with self as scene:
            obs_sceneitem = obspython.obs_scene_get_group(scene, name)
        return OBSSceneItem(obs_sceneitem)

    def add(self, source: OBSSource) -> OBSSceneItem:
        with self as scene, source as source_data:
            obs_sceneitem = obspython.obs_scene_add(scene, source_data)
        return OBSSceneItem(obs_sceneitem)

    def sceneitem_from_source(self, source: OBSSource) -> OBSSceneItem:
        with self as scene, source as source_data:
            obs_sceneitem = obspython.obs_scene_sceneitem_from_source(
                scene, source_data
            )
        return OBSSceneItem(obs_sceneitem)

    @property
    def is_group(self) -> bool:
        with self as scene:
            return obspython.obs_scene_is_group(scene)

    def prune_sources(self) -> None:
        with self as scene:
            obspython.obs_scene_prune_sources(scene)

from __future__ import annotations

from collections.abc import Callable
from enum import IntEnum

import obspython  # type: ignore

from .data import OBSData
from .reference import Reference


class obs_property_t: ...


class OBSProperty(Reference[obs_property_t]):
    def __init__(self, obs_property: obs_property_t):
        super().__init__(
            release=lambda _: None,
            ref=obs_property,
        )

    def set_modified_callback(
        self,
        callback: Callable[[OBSProperties, OBSProperty], None],
    ):
        def _callback(props: obs_properties_t, prop: obs_property_t):
            callback(OBSProperties(props), OBSProperty(prop))

        with self as prop:
            obspython.obs_property_set_modified_callback(prop, _callback)

    def set_modified_callback2(
        self,
        callback: Callable[[OBSProperties, OBSProperty], None],
        priv: object | None = None,
    ):
        with self as prop:
            obspython.obs_property_set_modified_callback2(prop, callback, priv)

    def property_modified(self, settings: OBSData):
        with self as prop, settings as obs_data:
            obspython.obs_property_modified(prop, obs_data)

    def button_clicked(self, settings: OBSData):
        with self as prop, settings as obs_data:
            obspython.obs_property_button_clicked(prop, obs_data)

    @property
    def name(self) -> str:
        with self as prop:
            return obspython.obs_property_name(prop)

    @property
    def description(self) -> str:
        with self as prop:
            return obspython.obs_property_description(prop)

    @description.setter
    def description(self, description: str):
        with self as prop:
            obspython.obs_property_set_description(prop, description)

    @property
    def long_description(self) -> str:
        with self as prop:
            return obspython.obs_property_long_description(prop)

    @long_description.setter
    def long_description(self, description: str):
        with self as prop:
            obspython.obs_property_set_long_description(prop, description)

    @property
    def type(self) -> OBSPropertyType:
        with self as prop:
            return OBSPropertyType(obspython.obs_property_get_type(prop))

    @property
    def enabled(self) -> bool:
        with self as prop:
            return obspython.obs_property_enabled(prop)

    @enabled.setter
    def enabled(self, enabled: bool):
        with self as prop:
            obspython.obs_property_set_enabled(prop, enabled)

    @property
    def visible(self) -> bool:
        with self as prop:
            return obspython.obs_property_visible(prop)

    @visible.setter
    def visible(self, visible: bool):
        with self as prop:
            obspython.obs_property_set_visible(prop, visible)

    @property
    def next(self) -> bool:
        with self as prop:
            return obspython.obs_property_next(prop)

    @property
    def int_min(self) -> int:
        with self as prop:
            return obspython.obs_property_int_min(prop)

    @property
    def int_max(self) -> int:
        with self as prop:
            return obspython.obs_property_int_max(prop)

    @property
    def int_step(self) -> int:
        with self as prop:
            return obspython.obs_property_int_step(prop)

    @property
    def int_type(self) -> OBSNumberType:
        with self as prop:
            return OBSNumberType(obspython.obs_property_int_type(prop))

    @property
    def int_suffix(self) -> str:
        with self as prop:
            return obspython.obs_property_int_suffix(prop)

    @int_suffix.setter
    def int_suffix(self, suffix: str):
        with self as prop:
            obspython.obs_property_int_set_suffix(prop, suffix)

    @property
    def float_min(self) -> float:
        with self as prop:
            return obspython.obs_property_float_min(prop)

    @property
    def float_max(self) -> float:
        with self as prop:
            return obspython.obs_property_float_max(prop)

    @property
    def float_step(self) -> float:
        with self as prop:
            return obspython.obs_property_float_step(prop)

    @property
    def float_type(self) -> OBSNumberType:
        with self as prop:
            return OBSNumberType(obspython.obs_property_float_type(prop))

    @property
    def float_suffix(self) -> str:
        with self as prop:
            return obspython.obs_property_float_suffix(prop)

    @float_suffix.setter
    def float_suffix(self, suffix: str):
        with self as prop:
            obspython.obs_property_float_set_suffix(prop, suffix)

    @property
    def text_type(self) -> OBSTextType:
        with self as prop:
            return OBSTextType(obspython.obs_property_text_type(prop))

    @property
    def text_monospace(self) -> bool:
        with self as prop:
            return obspython.obs_property_text_monospace(prop)

    @text_monospace.setter
    def text_monospace(self, monospace: bool):
        with self as prop:
            obspython.obs_property_text_set_monospace(prop, monospace)

    @property
    def text_info_type(self) -> OBSTextInfoType:
        with self as prop:
            return OBSTextInfoType(obspython.obs_property_text_info_type(prop))

    @text_info_type.setter
    def text_info_type(self, info_type: OBSTextInfoType):
        with self as prop:
            obspython.obs_property_text_set_info_type(prop, info_type.value)

    @property
    def text_info_word_wrap(self) -> bool:
        with self as prop:
            return obspython.obs_property_text_info_word_wrap(prop)

    @text_info_word_wrap.setter
    def text_info_word_wrap(self, word_wrap: bool):
        with self as prop:
            obspython.obs_property_text_set_info_word_wrap(prop, word_wrap)

    @property
    def path_type(self) -> OBSPathType:
        with self as prop:
            return OBSPathType(obspython.obs_property_path_type(prop))

    @property
    def path_filter(self) -> str:
        with self as prop:
            return obspython.obs_property_path_filter(prop)

    @property
    def path_default_path(self) -> str:
        with self as prop:
            return obspython.obs_property_path_default_path(prop)

    @property
    def list_type(self) -> OBSComboType:
        with self as prop:
            return OBSComboType(obspython.obs_property_list_type(prop))

    @property
    def list_format(self) -> OBSComboFormat:
        with self as prop:
            return OBSComboFormat(obspython.obs_property_list_format(prop))

    def int_set_limits(self, min: int, max: int, step: int):
        with self as prop:
            obspython.obs_property_int_set_limits(prop, min, max, step)

    def float_set_limits(self, min: float, max: float, step: float):
        with self as prop:
            obspython.obs_property_float_set_limits(prop, min, max, step)

    def list_clear(self):
        with self as prop:
            obspython.obs_property_list_clear(prop)

    def list_add_string(self, name: str, value: str):
        with self as prop:
            obspython.obs_property_list_add_string(prop, name, value)

    def list_add_int(self, name: str, value: int):
        with self as prop:
            obspython.obs_property_list_add_int(prop, name, value)

    def list_add_float(self, name: str, value: float):
        with self as prop:
            obspython.obs_property_list_add_float(prop, name, value)

    def list_add_bool(self, name: str, value: bool):
        with self as prop:
            obspython.obs_property_list_add_bool(prop, name, value)

    def list_insert_string(self, idx: int, name: str, value: str):
        with self as prop:
            obspython.obs_property_list_insert_string(prop, idx, name, value)

    def list_insert_int(self, idx: int, name: str, value: int):
        with self as prop:
            obspython.obs_property_list_insert_int(prop, idx, name, value)

    def list_insert_float(self, idx: int, name: str, value: float):
        with self as prop:
            obspython.obs_property_list_insert_float(prop, idx, name, value)

    def list_insert_bool(self, idx: int, name: str, value: bool):
        with self as prop:
            obspython.obs_property_list_insert_bool(prop, idx, name, value)

    def list_item_disable(self, idx: int, disable: bool):
        with self as prop:
            obspython.obs_property_list_item_disable(prop, idx, disable)

    def list_item_disabled(self, idx: int) -> bool:
        with self as prop:
            return obspython.obs_property_list_item_disabled(prop, idx)

    def list_item_remove(self, idx: int):
        with self as prop:
            obspython.obs_property_list_item_remove(prop, idx)

    @property
    def list_item_count(self) -> int:
        with self as prop:
            return obspython.obs_property_list_item_count(prop)

    def list_item_name(self, idx: int) -> str:
        with self as prop:
            return obspython.obs_property_list_item_name(prop, idx)

    def list_item_string(self, idx: int) -> str:
        with self as prop:
            return obspython.obs_property_list_item_string(prop, idx)

    def list_item_int(self, idx: int) -> int:
        with self as prop:
            return obspython.obs_property_list_item_int(prop, idx)

    def list_item_float(self, idx: int) -> float:
        with self as prop:
            return obspython.obs_property_list_item_float(prop, idx)

    def list_item_bool(self, idx: int) -> bool:
        with self as prop:
            return obspython.obs_property_list_item_bool(prop, idx)

    @property
    def editable_list_type(self) -> OBSEditableListType:
        with self as prop:
            return OBSEditableListType(obspython.obs_property_editable_list_type(prop))

    @property
    def editable_list_filter(self) -> str:
        with self as prop:
            return obspython.obs_property_editable_list_filter(prop)

    @property
    def editable_list_default_path(self) -> str:
        with self as prop:
            return obspython.obs_property_editable_list_default_path(prop)

    def frame_rate_clear(self):
        with self as prop:
            obspython.obs_property_frame_rate_clear(prop)

    def frame_rate_options_clear(self):
        with self as prop:
            obspython.obs_property_frame_rate_options_clear(prop)

    def rate_fps_ranges_clear(self):
        with self as prop:
            obspython.obs_property_frame_rate_fps_ranges_clear(prop)

    def frame_rate_option_add(self, name: str, description: str):
        with self as prop:
            obspython.obs_property_frame_rate_option_add(prop, name, description)

    def frame_rate_fps_range_add(self, min: int, max: int):
        with self as prop:
            obspython.obs_property_frame_rate_fps_range_add(prop, min, max)

    def frame_rate_option_insert(self, idx: int, name: str, description: str):
        with self as prop:
            obspython.obs_property_frame_rate_option_insert(prop, idx, name, description)

    def frame_rate_fps_range_insert(self, idx: int, min: int, max: int):
        with self as prop:
            obspython.obs_property_frame_rate_fps_range_insert(prop, idx, min, max)

    @property
    def frame_rate_options_count(self) -> int:
        with self as prop:
            return obspython.obs_property_frame_rate_options_count(prop)

    def frame_rate_option_name(self, idx: int) -> str:
        with self as prop:
            return obspython.obs_property_frame_rate_option_name(prop, idx)

    def frame_rate_option_description(self, idx: int) -> str:
        with self as prop:
            return obspython.obs_property_frame_rate_option_description(prop, idx)

    @property
    def frame_rate_fps_ranges_count(self) -> int:
        with self as prop:
            return obspython.obs_property_frame_rate_fps_ranges_count(prop)

    def frame_rate_fps_range_min(self, idx: int) -> int:
        with self as prop:
            return obspython.obs_property_frame_rate_fps_range_min(prop, idx)

    def frame_rate_fps_range_max(self, idx: int) -> int:
        with self as prop:
            return obspython.obs_property_frame_rate_fps_range_max(prop, idx)

    @property
    def group_type(self) -> OBSGroupType:
        with self as prop:
            return OBSGroupType(obspython.obs_property_group_type(prop))

    @property
    def group_content(self) -> OBSProperties:
        with self as prop:
            obs_properties = obspython.obs_property_group_content(prop)
        return OBSProperties(obs_properties)

    @property
    def button_type(self) -> OBSButtonType:
        with self as prop:
            return OBSButtonType(obspython.obs_property_button_type(prop))

    @button_type.setter
    def button_type(self, button_type: OBSButtonType):
        with self as prop:
            obspython.obs_property_button_set_type(prop, button_type.value)

    @property
    def button_url(self) -> str:
        with self as prop:
            return obspython.obs_property_button_url(prop)

    @button_url.setter
    def button_url(self, url: str):
        with self as prop:
            obspython.obs_property_button_set_url(prop, url)


class obs_properties_t: ...


# https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs-properties.h#L45-L116


class OBSPropertyType(IntEnum):
    INVALID = 0
    BOOL = 1
    INT = 2
    FLOAT = 3
    TEXT = 4
    PATH = 5
    LIST = 6
    COLOR = 7
    BUTTON = 8
    FONT = 9
    EDITABLE_LIST = 10
    FRAME_RATE = 11
    GROUP = 12
    COLOR_ALPHA = 13


class OBSComboFormat(IntEnum):
    INVALID = 0
    INT = 1
    FLOAT = 2
    STRING = 3
    BOOL = 4


class OBSComboType(IntEnum):
    INVALID = 0
    EDITABLE = 1
    LIST = 2
    RADIO = 3


class OBSEditableListType(IntEnum):
    STRINGS = 0
    FILES = 1
    FILES_AND_URLS = 2


class OBSPathType(IntEnum):
    FILE = 0
    FILE_SAVE = 1
    DIRECTORY = 2


class OBSTextType(IntEnum):
    DEFAULT = 0
    PASSWORD = 1
    MULTILINE = 2
    INFO = 3


class OBSTextInfoType(IntEnum):
    NORMAL = 0
    WARNING = 1
    ERROR = 2


class OBSNumberType(IntEnum):
    SCROLLER = 0
    SLIDER = 1


class OBSGroupType(IntEnum):
    INVALID = 0
    NORMAL = 1
    CHECKABLE = 2


class OBSButtonType(IntEnum):
    DEFAULT = 0
    URL = 1


class OBSProperties(Reference[obs_properties_t]):
    def __init__(self, obs_properties: obs_properties_t):
        super().__init__(
            release=obspython.obs_properties_destroy,
            ref=obs_properties,
        )

    @classmethod
    def create(cls) -> OBSProperties:
        obs_properties = obspython.obs_properties_create()
        return cls(obs_properties)

    def add_bool(
        self,
        name: str,
        description: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_bool(properties, name, description)
        return OBSProperty(obs_property)

    def add_int(
        self,
        name: str,
        description: str,
        min: int,
        max: int,
        step: int,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_int(properties, name, description, min, max, step)
        return OBSProperty(obs_property)

    def add_float(
        self,
        name: str,
        description: str,
        min: float,
        max: float,
        step: float,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_float(properties, name, description, min, max, step)
        return OBSProperty(obs_property)

    def add_int_slider(
        self,
        name: str,
        description: str,
        min: int,
        max: int,
        step: int,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_int_slider(properties, name, description, min, max, step)
        return OBSProperty(obs_property)

    def add_float_slider(
        self,
        name: str,
        description: str,
        min: float,
        max: float,
        step: float,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_float_slider(properties, name, description, min, max, step)
        return OBSProperty(obs_property)

    def add_text(
        self,
        name: str,
        description: str,
        text_type: OBSTextType,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_text(properties, name, description, text_type.value)
        return OBSProperty(obs_property)

    def add_path(
        self,
        name: str,
        description: str,
        path_type: OBSPathType,
        filter: str,
        default_path: str | None,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_path(
                properties, name, description, path_type.value, filter, default_path
            )
        return OBSProperty(obs_property)

    def add_list(
        self,
        name: str,
        description: str,
        combo_type: OBSComboType,
        combo_format: OBSComboFormat,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_list(
                properties, name, description, combo_type.value, combo_format.value
            )
        return OBSProperty(obs_property)

    def add_color(
        self,
        name: str,
        description: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_color(properties, name, description)
        return OBSProperty(obs_property)

    def add_color_alpha(
        self,
        name: str,
        description: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_color_alpha(properties, name, description)
        return OBSProperty(obs_property)

    def add_button(
        self,
        name: str,
        text: str,
        callback: Callable[[OBSProperties, OBSProperty], None],
    ) -> OBSProperty:
        def _callback(props: obs_properties_t, prop: obs_property_t):
            callback(OBSProperties(props), OBSProperty(prop))

        with self as properties:
            obs_property = obspython.obs_properties_add_button(properties, name, text, _callback)
        return OBSProperty(obs_property)

    def add_button2(
        self,
        name: str,
        text: str,
        callback: Callable[[OBSProperties, OBSProperty], None],
        priv: object | None = None,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_button2(properties, name, text, callback, priv)
        return OBSProperty(obs_property)

    def add_font(
        self,
        name: str,
        description: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_font(properties, name, description)
        return OBSProperty(obs_property)

    def add_editable_list(
        self,
        name: str,
        description: str,
        list_type: OBSEditableListType,
        filter: str,
        default_path: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_editable_list(
                properties, name, description, list_type.value, filter, default_path
            )
        return OBSProperty(obs_property)

    def add_frame_rate(
        self,
        name: str,
        description: str,
    ) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_add_frame_rate(properties, name, description)
        return OBSProperty(obs_property)

    def add_group(
        self,
        name: str,
        description: str,
        group_type: OBSGroupType,
        group: OBSProperties,
    ) -> OBSProperty:
        with self as properties, group as grp:
            obs_property = obspython.obs_properties_add_group(properties, name, description, group_type.value, grp)
        return OBSProperty(obs_property)

    @property
    def flags(self) -> int:
        with self as properties:
            return obspython.obs_properties_get_flags(properties)

    @flags.setter
    def flags(
        self,
        flags: int,
    ):
        with self as properties:
            obspython.obs_properties_set_flags(properties, flags)

    @property
    def first(self) -> OBSProperty:
        with self as properties:
            obs_property = obspython.obs_properties_first(properties)
        return OBSProperty(obs_property)

    def get(self, name: str) -> OBSProperty | None:
        with self as properties:
            obs_property = obspython.obs_properties_get(properties, name)
        if obs_property is None:
            return None
        return OBSProperty(obs_property)

    @property
    def parent(self) -> OBSProperties:
        with self as properties:
            obs_properties = obspython.obs_properties_get_parent(properties)
        return OBSProperties(obs_properties)

    def remove_by_name(self, name: str):
        with self as properties:
            obspython.obs_properties_remove_by_name(properties, name)

    def apply_settings(self, settings: OBSData):
        with self as properties, settings as obs_data:
            obspython.obs_properties_apply_settings(properties, obs_data)

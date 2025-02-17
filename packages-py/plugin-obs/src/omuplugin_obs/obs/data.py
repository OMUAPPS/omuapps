from __future__ import annotations

import json
from enum import IntEnum

import obspython  # type: ignore

from .reference import Reference


# https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs-data.h#L46-L59
class OBSDataType(IntEnum):
    NULL = 0
    STRING = 1
    NUMBER = 2
    BOOLEAN = 3
    OBJECT = 4
    ARRAY = 5


class OBSDataNumberType(IntEnum):
    INVALID = 0
    INT = 1
    DOUBLE = 2


class obs_data_item_t: ...


class OBSDataItem(Reference[obs_data_item_t]):
    def __init__(self, obs_data_item: obs_data_item_t):
        super().__init__(
            release=obspython.obs_data_item_release,
            ref=obs_data_item,
        )

    @property
    def has_user_value(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_has_user_value(data_item)

    @property
    def has_default_value(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_has_default_value(data_item)

    @property
    def has_autoselect_value(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_has_autoselect_value(data_item)

    def unset_user_value(self):
        with self as data_item:
            obspython.obs_data_item_unset_user_value(data_item)

    def unset_default_value(self):
        with self as data_item:
            obspython.obs_data_item_unset_default_value(data_item)

    def unset_autoselect_value(self):
        with self as data_item:
            obspython.obs_data_item_unset_autoselect_value(data_item)

    @property
    def type(self) -> OBSDataType:
        with self as data_item:
            return OBSDataType(obspython.obs_data_item_gettype(data_item))

    @property
    def numtype(self) -> OBSDataNumberType:
        with self as data_item:
            return OBSDataNumberType(obspython.obs_data_item_numtype(data_item))

    @property
    def name(self) -> str:
        with self as data_item:
            return obspython.obs_data_item_get_name(data_item)

    def set_string(self, value: str):
        with self as data_item:
            obspython.obs_data_item_set_string(data_item, value)

    def set_int(self, value: int):
        with self as data_item:
            obspython.obs_data_item_set_int(data_item, value)

    def set_double(self, value: float):
        with self as data_item:
            obspython.obs_data_item_set_double(data_item, value)

    def set_bool(self, value: bool):
        with self as data_item:
            obspython.obs_data_item_set_bool(data_item, value)

    def set_obj(self, value: OBSData):
        with self as data_item, value as obj:
            obspython.obs_data_item_set_obj(data_item, obj)

    def set_array(self, value: OBSDataArray):
        with self as data_item, value as array:
            obspython.obs_data_item_set_array(data_item, array)

    def set_default_string(self, value: str):
        with self as data_item:
            obspython.obs_data_item_set_default_string(data_item, value)

    def set_default_int(self, value: int):
        with self as data_item:
            obspython.obs_data_item_set_default_int(data_item, value)

    def set_default_double(self, value: float):
        with self as data_item:
            obspython.obs_data_item_set_default_double(data_item, value)

    def set_default_bool(self, value: bool):
        with self as data_item:
            obspython.obs_data_item_set_default_bool(data_item, value)

    def set_default_obj(self, value: OBSData):
        with self as data_item, value as obj:
            obspython.obs_data_item_set_default_obj(data_item, obj)

    def set_default_array(self, value: OBSDataArray):
        with self as data_item, value as array:
            obspython.obs_data_item_set_default_array(data_item, array)

    def set_autoselect_string(self, value: str):
        with self as data_item:
            obspython.obs_data_item_set_autoselect_string(data_item, value)

    def set_autoselect_int(self, value: int):
        with self as data_item:
            obspython.obs_data_item_set_autoselect_int(data_item, value)

    def set_autoselect_double(self, value: float):
        with self as data_item:
            obspython.obs_data_item_set_autoselect_double(data_item, value)

    def set_autoselect_bool(self, value: bool):
        with self as data_item:
            obspython.obs_data_item_set_autoselect_bool(data_item, value)

    def set_autoselect_obj(self, value: OBSData):
        with self as data_item, value as obj:
            obspython.obs_data_item_set_autoselect_obj(data_item, obj)

    def set_autoselect_array(self, value: OBSDataArray):
        with self as data_item, value as array:
            obspython.obs_data_item_set_autoselect_array(data_item, array)

    def get_string(self) -> str:
        with self as data_item:
            return obspython.obs_data_item_get_string(data_item)

    def get_int(self) -> int:
        with self as data_item:
            return obspython.obs_data_item_get_int(data_item)

    def get_double(self) -> float:
        with self as data_item:
            return obspython.obs_data_item_get_double(data_item)

    def get_bool(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_get_bool(data_item)

    def get_obj(self) -> OBSData:
        with self as data_item:
            obj = obspython.obs_data_item_get_obj(data_item)
        return OBSData(obj)

    def get_array(self) -> OBSDataArray:
        with self as data_item:
            array = obspython.obs_data_item_get_array(data_item)
        return OBSDataArray(array)

    def get_default_string(self) -> str:
        with self as data_item:
            return obspython.obs_data_item_get_default_string(data_item)

    def get_default_int(self) -> int:
        with self as data_item:
            return obspython.obs_data_item_get_default_int(data_item)

    def get_default_double(self) -> float:
        with self as data_item:
            return obspython.obs_data_item_get_default_double(data_item)

    def get_default_bool(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_get_default_bool(data_item)

    def get_default_obj(self) -> OBSData:
        with self as data_item:
            obj = obspython.obs_data_item_get_default_obj(data_item)
        return OBSData(obj)

    def get_default_array(self) -> OBSDataArray:
        with self as data_item:
            array = obspython.obs_data_item_get_default_array(data_item)
        return OBSDataArray(array)

    def get_autoselect_string(self) -> str:
        with self as data_item:
            return obspython.obs_data_item_get_autoselect_string(data_item)

    def get_autoselect_int(self) -> int:
        with self as data_item:
            return obspython.obs_data_item_get_autoselect_int(data_item)

    def get_autoselect_double(self) -> float:
        with self as data_item:
            return obspython.obs_data_item_get_autoselect_double(data_item)

    def get_autoselect_bool(self) -> bool:
        with self as data_item:
            return obspython.obs_data_item_get_autoselect_bool(data_item)

    def get_autoselect_obj(self) -> OBSData:
        with self as data_item:
            obj = obspython.obs_data_item_get_autoselect_obj(data_item)
        return OBSData(obj)

    def get_autoselect_array(self) -> OBSDataArray:
        with self as data_item:
            array = obspython.obs_data_item_get_autoselect_array(data_item)
        return OBSDataArray(array)


class obs_data_t: ...


class OBSData(Reference[obs_data_t]):
    def __init__(self, obs_data: obs_data_t):
        super().__init__(
            release=obspython.obs_data_release,
            ref=obs_data,
        )

    @classmethod
    def create(cls) -> OBSData:
        obs_data = obspython.obs_data_create()
        return cls(obs_data)

    @classmethod
    def from_json(cls, json_dict: dict) -> OBSData:
        json_string = json.dumps(json_dict)
        return cls.create_from_json(json_string)

    @classmethod
    def create_from_json(cls, json_string: str) -> OBSData:
        obs_data = obspython.obs_data_create_from_json(json_string)
        return cls(obs_data)

    @classmethod
    def create_from_json_file(cls, file_path: str) -> OBSData:
        obs_data = obspython.obs_data_create_from_json_file(file_path)
        return cls(obs_data)

    @classmethod
    def create_from_json_file_safe(cls, file_path: str, backup_ext: str) -> OBSData:
        obs_data = obspython.obs_data_create_from_json_file_safe(file_path, backup_ext)
        return cls(obs_data)

    def get_json(self) -> str:
        with self as data:
            return obspython.obs_data_get_json(data)

    def to_json(self) -> dict:
        return json.loads(self.get_json())

    def get_json_with_defaults(self) -> str:
        with self as data:
            return obspython.obs_data_get_json_with_defaults(data)

    def get_json_pretty(self) -> str:
        with self as data:
            return obspython.obs_data_get_json_pretty(data)

    def get_json_pretty_with_defaults(self) -> str:
        with self as data:
            return obspython.obs_data_get_json_pretty_with_defaults(data)

    def get_last_json(self) -> str:
        with self as data:
            return obspython.obs_data_get_last_json(data)

    def save_json(self, file: str) -> bool:
        with self as data:
            return obspython.obs_data_save_json(data, file)

    def save_json_safe(self, file: str, temp_ext: str, backup_ext: str) -> bool:
        with self as data:
            return obspython.obs_data_save_json_safe(data, file, temp_ext, backup_ext)

    def save_json_pretty_safe(self, file: str, temp_ext: str, backup_ext: str) -> bool:
        with self as data:
            return obspython.obs_data_save_json_pretty_safe(data, file, temp_ext, backup_ext)

    def apply(self, apply_data: OBSData):
        with self as data, apply_data as new_data:
            obspython.obs_data_apply(data, new_data)

    def erase(self, name: str):
        with self as data:
            obspython.obs_data_erase(data, name)

    def clear(self):
        with self as data:
            obspython.obs_data_clear(data)

    def get_string(self, key: str) -> str:
        with self as data:
            return obspython.obs_data_get_string(data, key)

    def set_string(self, key: str, value: str):
        with self as data:
            obspython.obs_data_set_string(data, key, value)

    def get_int(self, key: str) -> int:
        with self as data:
            return obspython.obs_data_get_int(data, key)

    def set_int(self, key: str, value: int):
        with self as data:
            obspython.obs_data_set_int(data, key, value)

    def get_double(self, key: str) -> float:
        with self as data:
            return obspython.obs_data_get_double(data, key)

    def set_double(self, key: str, value: float):
        with self as data:
            obspython.obs_data_set_double(data, key, value)

    def get_bool(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_get_bool(data, key)

    def set_bool(self, key: str, value: bool):
        with self as data:
            obspython.obs_data_set_bool(data, key, value)

    def get_obj(self, key: str) -> OBSData:
        with self as data:
            obj = obspython.obs_data_get_obj(data, key)
        return OBSData(obj)

    def set_obj(self, key: str, value: OBSData):
        with self as data, value as obj:
            obspython.obs_data_set_obj(data, key, obj)

    def get_array(self, key: str) -> OBSDataArray:
        with self as data:
            array = obspython.obs_data_get_array(data, key)
        return OBSDataArray(array)

    def set_array(self, key: str, value: OBSDataArray):
        with self as data, value as array:
            obspython.obs_data_set_array(data, key, array)

    def get_defaults(self) -> OBSData:
        with self as data:
            defaults = obspython.obs_data_get_defaults(data)
        return OBSData(defaults)

    def get_default_string(self, key: str) -> str:
        with self as data:
            return obspython.obs_data_get_default_string(data, key)

    def set_default_string(self, key: str, value: str):
        with self as data:
            obspython.obs_data_set_default_string(data, key, value)

    def get_default_int(self, key: str) -> int:
        with self as data:
            return obspython.obs_data_get_default_int(data, key)

    def set_default_int(self, key: str, value: int):
        with self as data:
            obspython.obs_data_set_default_int(data, key, value)

    def get_default_double(self, key: str) -> float:
        with self as data:
            return obspython.obs_data_get_default_double(data, key)

    def set_default_double(self, key: str, value: float):
        with self as data:
            obspython.obs_data_set_default_double(data, key, value)

    def get_default_bool(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_get_default_bool(data, key)

    def set_default_bool(self, key: str, value: bool):
        with self as data:
            obspython.obs_data_set_default_bool(data, key, value)

    def get_default_obj(self, key: str) -> OBSData:
        with self as data:
            obj = obspython.obs_data_get_default_obj(data, key)
        return OBSData(obj)

    def set_default_obj(self, key: str, value: OBSData):
        with self as data, value as obj:
            obspython.obs_data_set_default_obj(data, key, obj)

    def get_default_array(self, key: str) -> OBSDataArray:
        with self as data:
            array = obspython.obs_data_get_default_array(data, key)
        return OBSDataArray(array)

    def set_default_array(self, key: str, value: OBSDataArray):
        with self as data, value as array:
            obspython.obs_data_set_default_array(data, key, array)

    def get_autoselect_string(self, key: str) -> str:
        with self as data:
            return obspython.obs_data_get_autoselect_string(data, key)

    def set_autoselect_string(self, key: str, value: str):
        with self as data:
            obspython.obs_data_set_autoselect_string(data, key, value)

    def get_autoselect_int(self, key: str) -> int:
        with self as data:
            return obspython.obs_data_get_autoselect_int(data, key)

    def set_autoselect_int(self, key: str, value: int):
        with self as data:
            obspython.obs_data_set_autoselect_int(data, key, value)

    def get_autoselect_double(self, key: str) -> float:
        with self as data:
            return obspython.obs_data_get_autoselect_double(data, key)

    def set_autoselect_double(self, key: str, value: float):
        with self as data:
            obspython.obs_data_set_autoselect_double(data, key, value)

    def get_autoselect_bool(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_get_autoselect_bool(data, key)

    def set_autoselect_bool(self, key: str, value: bool):
        with self as data:
            obspython.obs_data_set_autoselect_bool(data, key, value)

    def get_autoselect_obj(self, key: str) -> OBSData:
        with self as data:
            obj = obspython.obs_data_get_autoselect_obj(data, key)
        return OBSData(obj)

    def set_autoselect_obj(self, key: str, value: OBSData):
        with self as data, value as obj:
            obspython.obs_data_set_autoselect_obj(data, key, obj)

    def get_autoselect_array(self, key: str) -> OBSDataArray:
        with self as data:
            array = obspython.obs_data_get_autoselect_array(data, key)
        return OBSDataArray(array)

    def set_autoselect_array(self, key: str, value: OBSDataArray):
        with self as data, value as array:
            obspython.obs_data_set_autoselect_array(data, key, array)

    def has_user_value(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_has_user_value(data, key)

    def has_default_value(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_has_default_value(data, key)

    def has_autoselect_value(self, key: str) -> bool:
        with self as data:
            return obspython.obs_data_has_autoselect_value(data, key)

    def unset_user_value(self, key: str):
        with self as data:
            obspython.obs_data_unset_user_value(data, key)

    def unset_default_value(self, key: str):
        with self as data:
            obspython.obs_data_unset_default_value(data, key)

    def unset_autoselect_value(self, key: str):
        with self as data:
            obspython.obs_data_unset_autoselect_value(data, key)

    @property
    def first(self) -> OBSDataItem:
        with self as data:
            data_item = obspython.obs_data_first(data)
        return OBSDataItem(data_item)

    def item_byname(self, name: str) -> OBSDataItem:
        with self as data:
            data_item = obspython.obs_data_item_byname(data, name)
        return OBSDataItem(data_item)


class obs_data_array_t: ...


class OBSDataArray(Reference[obs_data_array_t]):
    def __init__(self, obs_data_array: obs_data_array_t):
        super().__init__(
            release=obspython.obs_data_array_release,
            ref=obs_data_array,
        )

    @classmethod
    def create(cls) -> OBSDataArray:
        obs_data_array = obspython.obs_data_array_create()
        return cls(obs_data_array)

    def count(self) -> int:
        with self as data_array:
            return obspython.obs_data_array_count(data_array)

    def get(self, idx: int) -> OBSData:
        with self as data_array:
            obs_data = obspython.obs_data_array_item(data_array, idx)
        return OBSData(obs_data)

    def __getitem__(self, idx: int) -> OBSData:
        return self.get(idx)

    def push_back(self, data: OBSData) -> int:
        with self as data_array, data as data_item:
            return obspython.obs_data_array_push_back(data_array, data_item)

    def insert(self, idx: int, data: OBSData):
        with self as data_array, data as data_item:
            obspython.obs_data_array_insert(data_array, idx, data_item)

    def push_back_array(self, array: OBSDataArray):
        with self as data_array, array as data_array_item:
            obspython.obs_data_array_push_back_array(data_array, data_array_item)

    def erase(self, idx: int):
        with self as data_array:
            obspython.obs_data_array_erase(data_array, idx)

    def __iter__(self):
        for idx in range(self.count()):
            yield self.get(idx)

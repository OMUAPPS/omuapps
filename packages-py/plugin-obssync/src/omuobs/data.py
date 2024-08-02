from __future__ import annotations

import obspython  # type: ignore

from .reference import Reference


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

    def get_json(self) -> dict[str, str]:
        with self as data:
            return obspython.obs_data_get_json(data)


class obs_data_array_t: ...


class OBSDataArray(Reference[obs_data_array_t]):
    def __init__(self, obs_data_array: obs_data_array_t):
        super().__init__(
            release=obspython.obs_data_array_release,
            ref=obs_data_array,
        )

    def count(self) -> int:
        with self as data_array:
            return obspython.obs_data_array_count(data_array)

    def get(self, idx: int) -> OBSData:
        with self as data_array:
            obs_data = obspython.obs_data_array_item(data_array, idx)
        return OBSData(obs_data)

    def __iter__(self):
        for idx in range(self.count()):
            yield self.get(idx)

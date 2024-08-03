from __future__ import annotations

from enum import IntEnum
from typing import TYPE_CHECKING

import obspython  # type: ignore

from .data import OBSData, OBSDataArray
from .reference import Reference

if TYPE_CHECKING:
    from .scene import OBSScene


class OBSTransitionTarget(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L1624-L1627
    SOURCE_A = 0
    SOURCE_B = 1


class OBSTransitionMode(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs.h#L1636-L1639
    AUTO = 0
    MANUAL = 1


class OBSSourceType(IntEnum):
    # https://github.com/obsproject/obs-studio/blob/ff2fa24dc25519475687041ba6af829e9ba41335/libobs/obs-source.h#L33-L38
    INPUT = 0
    FILTER = 1
    TRANSITION = 2
    SCENE = 3


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

    @classmethod
    def get_source_by_uuid(cls, uuid: str) -> OBSSource | None:
        obs_source = obspython.obs_get_source_by_uuid(uuid)
        if obs_source is None:
            return None
        return cls(obs_source)

    @classmethod
    def get_transition_by_name(cls, name: str) -> OBSSource | None:
        obs_source = obspython.obs_get_transition_by_name(name)
        if obs_source is None:
            return None
        return cls(obs_source)

    @classmethod
    def get_transition_by_uuid(cls, uuid: str) -> OBSSource | None:
        obs_source = obspython.obs_get_transition_by_uuid(uuid)
        if obs_source is None:
            return None
        return cls(obs_source)

    def remove(self):
        with self as source:
            obspython.obs_source_remove(source)

    @property
    def removed(self) -> bool:
        with self as source:
            return obspython.obs_source_removed(source)

    @property
    def hidden(self) -> bool:
        with self as source:
            return obspython.obs_source_is_hidden(source)

    @hidden.setter
    def hidden(self, hidden: bool):
        with self as source:
            obspython.obs_source_set_hidden(source, hidden)

    @property
    def output_flags(self) -> int:
        with self as source:
            return obspython.obs_source_get_output_flags(source)

    @property
    def settings(self) -> OBSData:
        with self as source:
            obs_data = obspython.obs_source_get_settings(source)
        return OBSData(obs_data)

    @property
    def name(self) -> str:
        with self as source:
            return obspython.obs_source_get_name(source)

    @property
    def uuid(self) -> str:
        with self as source:
            return obspython.obs_source_get_uuid(source)

    @property
    def type(self) -> OBSSourceType:
        with self as source:
            return OBSSourceType(obspython.obs_source_get_type(source))

    @property
    def id(self) -> int:
        with self as source:
            return obspython.obs_source_get_id(source)

    @property
    def unversioned_id(self) -> int:
        with self as source:
            return obspython.obs_source_get_unversioned_id(source)

    @property
    def volume(self) -> float:
        with self as source:
            return obspython.obs_source_get_volume(source)

    @volume.setter
    def volume(self, volume: float):
        with self as source:
            obspython.obs_source_set_volume(source, volume)

    @property
    def balance_value(self) -> float:
        with self as source:
            return obspython.obs_source_get_balance_value(source)

    @balance_value.setter
    def balance_value(self, balance_value: float):
        with self as source:
            obspython.obs_source_set_balance_value(source, balance_value)

    @property
    def sync_offset(self) -> int:
        with self as source:
            return obspython.obs_source_get_sync_offset(source)

    @sync_offset.setter
    def sync_offset(self, sync_offset: int):
        with self as source:
            obspython.obs_source_set_sync_offset(source, sync_offset)

    @property
    def active(self) -> bool:
        with self as source:
            return obspython.obs_source_active(source)

    @property
    def showing(self) -> bool:
        with self as source:
            return obspython.obs_source_showing(source)

    @property
    def flags(self) -> int:
        with self as source:
            return obspython.obs_source_get_flags(source)

    @flags.setter
    def flags(self, flags: int):
        with self as source:
            obspython.obs_source_set_flags(source, flags)

    @property
    def audio_mixers(self) -> int:
        with self as source:
            return obspython.obs_source_get_audio_mixers(source)

    @audio_mixers.setter
    def audio_mixers(self, audio_mixers: int):
        with self as source:
            obspython.obs_source_set_audio_mixers(source, audio_mixers)

    def inc_showing(self):
        with self as source:
            obspython.obs_source_inc_showing(source)

    def inc_active(self):
        with self as source:
            obspython.obs_source_inc_active(source)

    def dec_showing(self):
        with self as source:
            obspython.obs_source_dec_showing(source)

    def dec_active(self):
        with self as source:
            obspython.obs_source_dec_active(source)

    def enum_filters(self) -> list[OBSSource]:
        filters = []
        with self as source:
            obs_filters = obspython.obs_source_enum_filters(source)  # type: ignore
            for obs_filter in obs_filters:
                filters.append(OBSSource(obs_filter))
            obspython.source_list_release(obs_filters)
        return filters

    @property
    def filters(self) -> list[OBSSource]:
        return self.enum_filters()

    def get_filter_by_name(self, name: str) -> OBSSource | None:
        with self as source:
            obs_filter = obspython.obs_source_get_filter_by_name(source, name)
        if obs_filter is None:
            return None
        return OBSSource(obs_filter)

    @property
    def filter_count(self) -> int:
        with self as source:
            return obspython.obs_source_filter_count(source)

    def copy_filters(self, src: OBSSource):
        with self as source, src as source_src:
            obspython.obs_source_copy_filters(source, source_src)

    def copy_single_filter(self, filter: OBSSource):
        with self as source, filter as filter_source:
            obspython.obs_source_copy_single_filter(source, filter_source)

    @property
    def enabled(self) -> bool:
        with self as source:
            return obspython.obs_source_enabled(source)

    @enabled.setter
    def enabled(self, enabled: bool):
        with self as source:
            obspython.obs_source_set_enabled(source, enabled)

    @property
    def muted(self) -> bool:
        with self as source:
            return obspython.obs_source_muted(source)

    @muted.setter
    def muted(self, muted: bool):
        with self as source:
            obspython.obs_source_set_muted(source, muted)

    @property
    def push_to_mute_enabled(self) -> bool:
        with self as source:
            return obspython.obs_source_push_to_mute_enabled(source)

    @push_to_mute_enabled.setter
    def push_to_mute_enabled(self, enabled: bool):
        self.enable_push_to_mute(enabled)

    def enable_push_to_mute(self, enabled: bool):
        with self as source:
            obspython.obs_source_enable_push_to_mute(source, enabled)

    @property
    def push_to_mute_delay(self) -> int:
        with self as source:
            return obspython.obs_source_get_push_to_mute_delay(source)

    @push_to_mute_delay.setter
    def push_to_mute_delay(self, delay: int):
        self.set_push_to_mute_delay(delay)

    def set_push_to_mute_delay(self, delay: int):
        with self as source:
            obspython.obs_source_set_push_to_mute_delay(source, delay)

    @property
    def push_to_talk_enabled(self) -> bool:
        with self as source:
            return obspython.obs_source_push_to_talk_enabled(source)

    @push_to_talk_enabled.setter
    def push_to_talk_enabled(self, enabled: bool):
        self.enable_push_to_talk(enabled)

    def enable_push_to_talk(self, enabled: bool):
        with self as source:
            obspython.obs_source_enable_push_to_talk(source, enabled)

    @property
    def push_to_talk_delay(self) -> int:
        with self as source:
            return obspython.obs_source_get_push_to_talk_delay(source)

    @push_to_talk_delay.setter
    def push_to_talk_delay(self, delay: int):
        self.set_push_to_talk_delay(delay)

    def set_push_to_talk_delay(self, delay: int):
        with self as source:
            obspython.obs_source_set_push_to_talk_delay(source, delay)

    # obs_source_add_audio_pause_callback
    # obs_source_remove_audio_pause_callback
    # obs_source_add_audio_capture_callback
    # obs_source_remove_audio_capture_callback
    # obs_source_add_caption_callback
    # obs_source_remove_caption_callback

    @property
    def private_settings(self) -> OBSData:
        with self as source:
            obs_data = obspython.obs_source_get_private_settings(source)
        return OBSData(obs_data)

    def backup_filters(self) -> OBSDataArray:
        with self as source:
            obs_data_array = obspython.obs_source_backup_filters(source)
        return OBSDataArray(obs_data_array)

    def restore_filters(self, data: OBSDataArray):
        with self as source, data as data_data:
            obspython.obs_source_restore_filters(source, data_data)

    # obs_source_get_type_data

    def skip_video_filter(self):
        with self as source:
            obspython.obs_source_skip_video_filter(source)

    def add_active_child(self, child: OBSSource):
        with self as source, child as child_source:
            obspython.obs_source_add_active_child(source, child_source)

    def remove_active_child(self, child: OBSSource):
        with self as source, child as child_source:
            obspython.obs_source_remove_active_child(source, child_source)

    def send_mouse_click(
        self,
        event: obspython.obs_mouse_event,
        type: int,
        mouse_up: bool,
        click_count: int,
    ):
        with self as source:
            obspython.obs_source_send_mouse_click(
                source, event, type, mouse_up, click_count
            )

    def send_mouse_move(self, event: obspython.obs_mouse_event, mouse_leave: bool):
        with self as source:
            obspython.obs_source_send_mouse_move(source, event, mouse_leave)

    def send_mouse_wheel(
        self, event: obspython.obs_mouse_event, x_delta: int, y_delta: int
    ):
        with self as source:
            obspython.obs_source_send_mouse_wheel(source, event, x_delta, y_delta)

    def send_focus(self, focus: bool):
        with self as source:
            obspython.obs_source_send_focus(source, focus)

    def send_key_click(self, event: obspython.obs_key_event, key_up: bool):
        with self as source:
            obspython.obs_source_send_key_click(source, event, key_up)

    def set_default_flags(self, flags: int):
        with self as source:
            obspython.obs_source_set_default_flags(source, flags)

    def get_base_width(self) -> int:
        with self as source:
            return obspython.obs_source_get_base_width(source)

    @property
    def base_width(self) -> int:
        return self.get_base_width()

    def get_base_height(self) -> int:
        with self as source:
            return obspython.obs_source_get_base_height(source)

    @property
    def base_height(self) -> int:
        return self.get_base_height()

    def audio_pending(self) -> bool:
        with self as source:
            return obspython.obs_source_audio_pending(source)

    def get_audio_timestamp(self) -> int:
        with self as source:
            return obspython.obs_source_get_audio_timestamp(source)

    def get_audio_mix(self, audio: obspython.obs_source_audio_mix):
        with self as source:
            obspython.obs_source_get_audio_mix(source, audio)

    def set_async_unbuffered(self, unbuffered: bool):
        with self as source:
            obspython.obs_source_set_async_unbuffered(source, unbuffered)

    @property
    def async_unbuffered(self) -> bool:
        with self as source:
            return obspython.obs_source_async_unbuffered(source)

    @async_unbuffered.setter
    def async_unbuffered(self, unbuffered: bool):
        self.set_async_unbuffered(unbuffered)

    def set_async_decoupled(self, decoupled: bool):
        with self as source:
            obspython.obs_source_set_async_decoupled(source, decoupled)

    @property
    def async_decoupled(self) -> bool:
        with self as source:
            return obspython.obs_source_async_decoupled(source)

    @async_decoupled.setter
    def async_decoupled(self, decoupled: bool):
        self.set_async_decoupled(decoupled)

    @property
    def audio_active(self) -> bool:
        with self as source:
            return obspython.obs_source_audio_active(source)

    def get_last_obs_version(self) -> int:
        with self as source:
            return obspython.obs_source_get_last_obs_version(source)

    def media_play_pause(self, pause: bool):
        with self as source:
            obspython.obs_source_media_play_pause(source, pause)

    def media_restart(self):
        with self as source:
            obspython.obs_source_media_restart(source)

    def media_stop(self):
        with self as source:
            obspython.obs_source_media_stop(source)

    def media_next(self):
        with self as source:
            obspython.obs_source_media_next(source)

    def media_previous(self):
        with self as source:
            obspython.obs_source_media_previous(source)

    def media_get_duration(self) -> int:
        with self as source:
            return obspython.obs_source_media_get_duration(source)

    def media_get_time(self) -> int:
        with self as source:
            return obspython.obs_source_media_get_time(source)

    def media_set_time(self, time: int):
        with self as source:
            obspython.obs_source_media_set_time(source, time)

    @property
    def media_time(self) -> int:
        return self.media_get_time()

    @media_time.setter
    def media_time(self, time: int):
        self.media_set_time(time)

    # media_get_state

    def media_started(self):
        with self as source:
            obspython.obs_source_media_started(source)

    def media_ended(self):
        with self as source:
            obspython.obs_source_media_ended(source)

    def transition_get_source(self, target: OBSTransitionTarget) -> OBSSource:
        with self as source:
            obs_source = obspython.obs_transition_get_source(source, target.value)
        return OBSSource(obs_source)

    def transition_clear(self):
        with self as source:
            obspython.obs_transition_clear(source)

    def transition_get_active_source(self) -> OBSSource:
        with self as source:
            obs_source = obspython.obs_transition_get_active_source(source)
        return OBSSource(obs_source)

    def transition_start(
        self, mode: OBSTransitionMode, duration_ms: int, dest: OBSSource
    ) -> bool:
        with self as source, dest as dest_source:
            return obspython.obs_transition_start(
                source, mode.value, duration_ms, dest_source
            )

    def transition_set(self, source: OBSSource):
        with self as transition, source as source_source:
            obspython.obs_transition_set(transition, source_source)

    def transition_set_manual_time(self, time: int):
        with self as source:
            obspython.obs_transition_set_manual_time(source, time)

    def transition_set_manual_torque(self, torque: float, clamp: float):
        with self as source:
            obspython.obs_transition_set_manual_torque(source, torque, clamp)

    # transition_set_scale_type...

    @property
    def scene(self) -> OBSScene:
        with self as source:
            obs_scene = obspython.obs_scene_from_source(source)
        from .scene import OBSScene

        return OBSScene(obs_scene)

    @property
    def is_scene(self) -> bool:
        with self as source:
            return obspython.obs_source_is_scene(source)

    @property
    def is_group(self) -> bool:
        with self as source:
            return obspython.obs_source_is_group(source)

    @property
    def group(self) -> OBSSource:
        with self as source:
            obs_group = obspython.obs_group_from_source(source)
        return OBSSource(obs_group)

    @property
    def group_or_scene(self) -> OBSSource:
        with self as source:
            obs_group_or_scene = obspython.obs_group_or_scene_from_source(source)
        return OBSSource(obs_group_or_scene)


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

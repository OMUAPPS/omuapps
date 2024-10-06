from typing import TypedDict

from omu.extension.registry import RegistryPermissions, RegistryType

from .const import PLUGIN_ID
from .discordrpc.payloads import VoiceStateItem
from .permissions import DISCORDRPC_VC_READ_PERMISSION_ID

VOICE_STATE_REGISTRY_TYPE = RegistryType[dict[str, VoiceStateItem]].create_json(
    PLUGIN_ID,
    "voice_states",
    default_value={},
    permissions=RegistryPermissions(read=DISCORDRPC_VC_READ_PERMISSION_ID),
)


class SpeakState(TypedDict):
    speaking: bool
    speaking_start: int
    speaking_stop: int


SPEAKING_STATE_REGISTRY_TYPE = RegistryType[dict[str, SpeakState]].create_json(
    PLUGIN_ID,
    "speaking_states",
    default_value={},
    permissions=RegistryPermissions(read=DISCORDRPC_VC_READ_PERMISSION_ID),
)

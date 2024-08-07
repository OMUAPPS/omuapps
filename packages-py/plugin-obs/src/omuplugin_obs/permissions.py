from omu.extension.permission.permission import PermissionType

from .const import PLUGIN_ID

OBS_SOURCE_READ_PERMISSION_ID = PLUGIN_ID / "source" / "read"
OBS_SOURCE_READ_PERMISSION_TYPE = PermissionType(
    OBS_SOURCE_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "ソース情報の読み取り",
            "en": "Read source",
        },
    },
)
OBS_SOURCE_CREATE_PERMISSION_ID = PLUGIN_ID / "source" / "create"
OBS_SOURCE_CREATE_PERMISSION_TYPE = PermissionType(
    OBS_SOURCE_CREATE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "ソースの作成",
            "en": "Create source",
        },
    },
)
OBS_SOURCE_UPDATE_PERMISSION_ID = PLUGIN_ID / "source" / "write"
OBS_SOURCE_UPDATE_PERMISSION_TYPE = PermissionType(
    OBS_SOURCE_UPDATE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "ソース情報の更新",
            "en": "Update source",
        },
    },
)
OBS_SOURCE_REMOVE_PERMISSION_ID = PLUGIN_ID / "source" / "remove"
OBS_SOURCE_REMOVE_PERMISSION_TYPE = PermissionType(
    OBS_SOURCE_REMOVE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "ソースの削除",
            "en": "Remove source",
        },
    },
)
OBS_SCENE_READ_PERMISSION_ID = PLUGIN_ID / "scene" / "read"
OBS_SCENE_READ_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "シーン情報の読み取り",
            "en": "Read scene",
        },
    },
)
OBS_SCENE_CREATE_PERMISSION_ID = PLUGIN_ID / "scene" / "create"
OBS_SCENE_CREATE_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_CREATE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "シーンの作成",
            "en": "Create scene",
        },
    },
)
OBS_SCENE_UPDATE_PERMISSION_ID = PLUGIN_ID / "scene" / "write"
OBS_SCENE_UPDATE_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_UPDATE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "シーン情報の更新",
            "en": "Update scene",
        },
    },
)
OBS_SCENE_REMOVE_PERMISSION_ID = PLUGIN_ID / "scene" / "remove"
OBS_SCENE_REMOVE_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_REMOVE_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "シーンの削除",
            "en": "Remove scene",
        },
    },
)
OBS_SCENE_SET_PERMISSION_ID = PLUGIN_ID / "scene" / "set"
OBS_SCENE_SET_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_SET_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "シーンの切り替え",
            "en": "Switch scene",
        },
    },
)


PERMISSION_TYPES = [
    OBS_SOURCE_READ_PERMISSION_TYPE,
    OBS_SOURCE_CREATE_PERMISSION_TYPE,
    OBS_SOURCE_UPDATE_PERMISSION_TYPE,
    OBS_SOURCE_REMOVE_PERMISSION_TYPE,
    OBS_SCENE_READ_PERMISSION_TYPE,
    OBS_SCENE_CREATE_PERMISSION_TYPE,
    OBS_SCENE_UPDATE_PERMISSION_TYPE,
    OBS_SCENE_REMOVE_PERMISSION_TYPE,
    OBS_SCENE_SET_PERMISSION_TYPE,
]

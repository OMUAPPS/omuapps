from omu.api.permission.permission import PermissionType

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
        "note": {
            "ja": "OBS上のソース情報を使うために使われます",
            "en": "Used to access source information on OBS",
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
        "note": {
            "ja": "OBS上に新しいソースを作成するために使われます",
            "en": "Used to create a new source on OBS",
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
        "note": {
            "ja": "OBS上のソース情報を更新するために使われます",
            "en": "Used to update source information on OBS",
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
        "note": {
            "ja": "OBS上のソースを削除するために使われます",
            "en": "Used to remove a source on OBS",
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
        "note": {
            "ja": "OBS上のシーン情報を使うために使われます",
            "en": "Used to access scene information on OBS",
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
        "note": {
            "ja": "OBS上に新しいシーンを作成するために使われます",
            "en": "Used to create a new scene on OBS",
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
        "note": {
            "ja": "OBS上のシーン情報を更新するために使われます",
            "en": "Used to update scene information on OBS",
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
        "note": {
            "ja": "OBS上のシーンを削除するために使われます",
            "en": "Used to remove a scene on OBS",
        },
    },
)
OBS_SCENE_SET_CURRENT_PERMISSION_ID = PLUGIN_ID / "scene" / "set_current"
OBS_SCENE_SET_CURRENT_PERMISSION_TYPE = PermissionType(
    OBS_SCENE_SET_CURRENT_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "シーンの切り替え",
            "en": "Switch scene",
        },
        "note": {
            "ja": "OBS上のシーンを切り替えるために使われます",
            "en": "Used to switch a scene on OBS",
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
    OBS_SCENE_SET_CURRENT_PERMISSION_TYPE,
]

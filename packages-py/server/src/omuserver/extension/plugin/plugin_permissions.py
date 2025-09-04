from omu.api.permission.permission import PermissionType
from omu.api.plugin import (
    PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
    PLUGIN_READ_PACKAGE_PERMISSION_ID,
)

PLUGIN_MANAGE_PERMISSION = PermissionType(
    PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
    metadata={
        "level": "high",
        "name": {
            "ja": "プラグインを管理",
            "en": "Manage packages",
        },
        "note": {
            "ja": "任意のプラグインの追加や更新、再読み込みを行う",
            "en": "Add, update, or reload any plugin",
        },
    },
)

PLUGIN_READ_PERMISSION = PermissionType(
    PLUGIN_READ_PACKAGE_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "プラグインを取得",
            "en": "Read packages",
        },
        "note": {
            "ja": "インストールされているプラグインに関する情報を取得",
            "en": "Get information about installed plugins",
        },
    },
)

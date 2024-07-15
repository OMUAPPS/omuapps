from omu.extension.permission import (
    PERMISSION_READ_PERMISSION_ID,
    PERMISSION_REMOVE_PERMISSION_ID,
    PermissionType,
)

PERMISSION_READ_PERMISSION = PermissionType(
    PERMISSION_READ_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "すべてのアプリの権限情報を取得",
            "en": "Get all app permission information",
        },
        "note": {
            "ja": "すべてのアプリの権限情報を取得するために使われます",
            "en": "Used to get all app permission information",
        },
    },
)
PERMISSION_REMOVE_PERMISSION = PermissionType(
    PERMISSION_REMOVE_PERMISSION_ID,
    {
        "level": "high",
        "name": {
            "ja": "アプリの権限を削除",
            "en": "Remove app permission",
        },
        "note": {
            "ja": "アプリの権限を削除するために使われます",
            "en": "Used to remove app permission",
        },
    },
)

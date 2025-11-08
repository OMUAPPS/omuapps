from omu.api.permission import PermissionType
from omu.api.server import (
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
)
from omu.api.server.extension import SERVER_APPS_WRITE_PERMISSION_ID, TRUSTED_ORIGINS_GET_PERMISSION_ID

SERVER_SHUTDOWN_PERMISSION = PermissionType(
    id=SERVER_SHUTDOWN_PERMISSION_ID,
    metadata={
        "level": "medium",
        "name": {
            "ja": "サーバーをシャットダウン",
            "en": "Shutdown Server",
        },
        "note": {
            "ja": "アプリが内部のAPIサーバーをシャットダウンするために使われます",
            "en": "Used by apps to shut down the internal API server",
        },
    },
)
SERVER_APPS_READ_PERMISSION = PermissionType(
    id=SERVER_APPS_READ_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "アプリ一覧を取得",
            "en": "Get Running Apps",
        },
        "note": {
            "ja": "すべてのおむアプリ一覧を取得するために使われます",
            "en": "Used to get a list of omu-apps connected to the server",
        },
    },
)
SERVER_APPS_WRITE_PERMISSION = PermissionType(
    id=SERVER_APPS_WRITE_PERMISSION_ID,
    metadata={
        "level": "high",
        "name": {
            "ja": "アプリを管理",
            "en": "Manage",
        },
        "note": {
            "ja": "インストールされているおむアプリを管理します",
            "en": "Used to manage list of omu-apps installed to the server",
        },
    },
)
SERVER_TRUSTED_ORIGINS_GET_PERMISSION = PermissionType(
    id=TRUSTED_ORIGINS_GET_PERMISSION_ID,
    metadata={
        "level": "high",
        "name": {
            "ja": "信頼されたオリジンを取得",
            "en": "Get Trusted Origins",
        },
        "note": {
            "ja": "認証を通過するオリジンを取得するために使われます",
            "en": "Used to get origins that pass authentication",
        },
    },
)

from omu.extension.permission import PermissionType
from omu.extension.server import (
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
)

SERVER_SHUTDOWN_PERMISSION = PermissionType(
    id=SERVER_SHUTDOWN_PERMISSION_ID,
    metadata={
        "level": "high",
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
            "ja": "起動中のアプリを取得",
            "en": "Get Running Apps",
        },
        "note": {
            "ja": "内部のAPIサーバーに接続されているアプリのリストを取得するために使われます",
            "en": "Used to get a list of apps connected to the server",
        },
    },
)

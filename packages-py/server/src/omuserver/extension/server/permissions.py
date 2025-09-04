from omu.api.permission import PermissionType
from omu.api.server import (
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_SESSIONS_READ_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
)
from omu.api.server.extension import REMOTE_APP_REQUEST_PERMISSION_ID, TRUSTED_ORIGINS_GET_PERMISSION_ID

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
            "ja": "すべてのアプリ一覧を取得するために使われます",
            "en": "Used to get a list of apps connected to the server",
        },
    },
)
SERVER_SESSIONS_READ_PERMISSION = PermissionType(
    id=SERVER_SESSIONS_READ_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "接続中のアプリを取得",
            "en": "Get Running Apps",
        },
        "note": {
            "ja": "接続されているアプリ一覧を取得するために使われます",
            "en": "Used to get a list of apps connected to the server",
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
REMOTE_APP_REQUEST_PERMISSION = PermissionType(
    REMOTE_APP_REQUEST_PERMISSION_ID,
    metadata={
        "level": "high",
        "name": {
            "ja": "遠隔アプリを要求",
            "en": "Request Remote App",
        },
        "note": {},
    },
)

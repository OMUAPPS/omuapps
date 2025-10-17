from omu.api.permission.permission import PermissionType
from omu.api.session.extension import (
    GENERATE_TOKEN_PERMISSION_ID,
    REMOTE_APP_REQUEST_PERMISSION_ID,
    SESSIONS_READ_PERMISSION_ID,
)

SESSIONS_READ_PERMISSION = PermissionType(
    id=SESSIONS_READ_PERMISSION_ID,
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

GENERATE_TOKEN_PERMISSION = PermissionType(
    GENERATE_TOKEN_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "認証トークンを生成",
            "en": "Generate Auth Token",
        },
    },
)

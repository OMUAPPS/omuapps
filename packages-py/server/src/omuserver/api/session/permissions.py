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
            "ja": "どのアプリが接続されているかを確認するために使われます",
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
        "note": {
            "ja": "ネットワークを経由して操作を可能にするために使われます",
            "en": "Used to enable control over the network",
        },
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
        "note": {
            "ja": "OBSにアプリを追加したり、複数画面でアプリを起動するために使われます",
            "en": "Used to add apps to OBS or launch apps on multiple screens",
        },
    },
)

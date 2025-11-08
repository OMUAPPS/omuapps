from omu.api.dashboard import (
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
)
from omu.api.permission import PermissionType

DASHBOARD_SET_PERMISSION = PermissionType(
    DASHBOARD_SET_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "管理者権限",
            "en": "Manage the dashboard",
        },
        "note": {
            "ja": "アプリが権限の管理やユーザーに確認を行うために使われます",
            "en": "Used by apps to manage permissions and confirm users",
        },
    },
)
DASHBOARD_OPEN_APP_PERMISSION = PermissionType(
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "アプリを開く",
            "en": "Open an app",
        },
        "note": {
            "ja": "インストールされているアプリを起動するために使われます",
            "en": "Used to start an installed app",
        },
    },
)
DASHBOARD_APP_INSTALL_PERMISSION = PermissionType(
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    {
        "level": "high",
        "name": {
            "ja": "アプリを追加",
            "en": "Install an app",
        },
        "note": {
            "ja": "新しくアプリを追加するために使われます",
            "en": "Used to install an app",
        },
    },
)
DASHBOARD_DRAG_DROP_PERMISSION = PermissionType(
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "ファイルのドラッグドロップ",
            "en": "Get File Drag Drop Information",
        },
    },
)
DASHBOARD_WEBVIEW_PERMISSION = PermissionType(
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    {
        "level": "high",
        "name": {
            "ja": "外部サイトのログインを使用",
            "en": "Use external sites to login",
        },
        "note": {
            "ja": "すべてのアクセスが可能なため、慎重に扱う必要があります",
            "en": "Since it can access everything, it needs to be handled carefully",
        },
    },
)
DASHBOARD_SPEECH_RECOGNITION_PERMISSION = PermissionType(
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    {
        "level": "medium",
        "name": {
            "ja": "音声認識を使用",
            "en": "Use Speech Recognition",
        },
    },
)

from omu.api.dashboard import (
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_APP_UPDATE_PERMISSION_ID,
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
)
from omu.api.permission import PermissionType

DASHBOARD_SET_PERMISSION = PermissionType(
    DASHBOARD_SET_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "全体を管理する権限",
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
DASHOBARD_APP_READ_PERMISSION = PermissionType(
    DASHOBARD_APP_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "インストールされたアプリの情報を取得",
            "en": "Get Installed App Information",
        },
        "note": {
            "ja": "すでにインストールされているアプリの情報を取得するために使われます",
            "en": "Used to get information about already installed apps",
        },
    },
)
DASHOBARD_APP_EDIT_PERMISSION = PermissionType(
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    {
        "level": "high",
        "name": {
            "ja": "インストールされたアプリ情報を編集",
            "en": "Edit Installed App Information",
        },
        "note": {
            "ja": "インストールされたアプリの情報を編集するために使われます",
            "en": "Used to edit information about installed apps",
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
DASHBOARD_APP_UPDATE_PERMISSION = PermissionType(
    DASHBOARD_APP_UPDATE_PERMISSION_ID,
    {
        "level": "high",
        "name": {
            "ja": "アプリ情報を更新",
            "en": "Update an app",
        },
        "note": {
            "ja": "アプリの情報を更新するために使われます",
            "en": "Used to update an app",
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

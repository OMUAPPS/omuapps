from omu.extension.dashboard import (
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
)
from omu.extension.permission import PermissionType

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

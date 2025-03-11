from omu.extension.asset import (
    ASSET_DOWNLOAD_PERMISSION_ID,
    ASSET_UPLOAD_PERMISSION_ID,
)
from omu.extension.asset.asset_extension import ASSET_DELETE_PERMISSION_ID
from omu.extension.permission import PermissionType

ASSET_UPLOAD_PERMISSION = PermissionType(
    id=ASSET_UPLOAD_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "ファイルを保存",
            "en": "Save a file",
        },
        "note": {
            "ja": "アプリがファイルを保持するために使われます",
            "en": "Used by apps to store files",
        },
    },
)
ASSET_DOWNLOAD_PERMISSION = PermissionType(
    id=ASSET_DOWNLOAD_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "ファイルをダウンロード",
            "en": "Download a file",
        },
        "note": {
            "ja": "アプリが保存したファイルを読み込みなおすために使われます",
            "en": "Used by apps to reload saved files",
        },
    },
)
ASSET_DELETE_PERMISSION = PermissionType(
    id=ASSET_DELETE_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "ファイルを削除",
            "en": "Delete a file",
        },
        "note": {
            "ja": "アプリが保存したファイルを削除するために使われます",
            "en": "Used by apps to delete saved files",
        },
    },
)

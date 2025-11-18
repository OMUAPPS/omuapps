from omu.api.asset import (
    ASSET_PERMISSION_ID,
)
from omu.api.permission import PermissionType

ASSET_PERMISSION = PermissionType(
    id=ASSET_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "ファイルを保持",
            "en": "Save a file",
        },
        "note": {
            "ja": "アプリがファイルを保持するために使われます",
            "en": "Used by apps to store files",
        },
    },
)

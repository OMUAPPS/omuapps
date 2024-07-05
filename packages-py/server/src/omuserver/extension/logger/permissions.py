from omu.extension.logger.logger_extension import LOGGER_LOG_PERMISSION_ID
from omu.extension.permission.permission import PermissionType

LOGGER_LOG_PERMISSION = PermissionType(
    id=LOGGER_LOG_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "アプリの動作記録を保存",
            "en": "Save app operation records",
        },
        "note": {
            "ja": "不具合などの調査のために使われます",
            "en": "Used for investigation of problems",
        },
    },
)

from omu.api.http.extension import HTTP_REQUEST_PERMISSION_ID
from omu.api.permission.permission import PermissionType

HTTP_REQUEST_PERMISSION = PermissionType(
    HTTP_REQUEST_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "en": "HTTP Requests",
            "ja": "HTTPリクエスト",
        },
        "note": {
            "ja": "アプリが外部のサイトにアクセスすることを許可します。",
            "en": "Allows apps to access external sites.",
        },
    },
)

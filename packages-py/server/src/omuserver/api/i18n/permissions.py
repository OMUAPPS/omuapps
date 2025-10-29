from omu.api.i18n import I18N_SET_LOCALES_PERMISSION_ID
from omu.api.i18n.extension import I18N_GET_LOCALES_PERMISSION_ID
from omu.api.permission import PermissionType

I18N_SET_LOCALES_PERMISSION = PermissionType(
    id=I18N_SET_LOCALES_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "地域設定を変更",
            "en": "Change locale settings",
        },
        "note": {
            "ja": "言語や通貨など地域設定を変更するために使われます",
            "en": "Used to change locale settings such as language and currency",
        },
    },
)
I18N_GET_LOCALES_PERMISSION = PermissionType(
    id=I18N_GET_LOCALES_PERMISSION_ID,
    metadata={
        "level": "low",
        "name": {
            "ja": "地域設定を取得",
            "en": "Get locale settings",
        },
        "note": {
            "ja": "言語や通貨など地域設定を取得するために使われます",
            "en": "Used to get locale settings such as language and currency",
        },
    },
)

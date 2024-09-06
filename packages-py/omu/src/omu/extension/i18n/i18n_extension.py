from omu.client import Client
from omu.extension import Extension, ExtensionType
from omu.extension.registry import RegistryType
from omu.extension.registry.packets import RegistryPermissions
from omu.localization import Locale, LocalizedText

I18N_EXTENSION_TYPE = ExtensionType(
    "i18n", lambda client: I18nExtension(client), lambda: []
)
I18N_SET_LOCALES_PERMISSION_ID = I18N_EXTENSION_TYPE / "locales" / "set"
I18N_GET_LOCALES_PERMISSION_ID = I18N_EXTENSION_TYPE / "locales" / "get"
I18N_LOCALES_REGISTRY_TYPE = RegistryType[list[Locale]].create_json(
    I18N_EXTENSION_TYPE,
    name="locales",
    default_value=[],
    permissions=RegistryPermissions(
        read=I18N_GET_LOCALES_PERMISSION_ID,
        write=I18N_SET_LOCALES_PERMISSION_ID,
    ),
)


class I18nExtension(Extension):
    @property
    def type(self) -> ExtensionType:
        return I18N_EXTENSION_TYPE

    def __init__(self, client: Client):
        self.client = client
        client.permissions.require(I18N_GET_LOCALES_PERMISSION_ID)
        self.locales_registry = client.registries.get(I18N_LOCALES_REGISTRY_TYPE)
        self.locales: list[Locale] = []
        self.default_locales: list[Locale] = []

    def get_locales(self) -> list[Locale]:
        if self.locales:
            return self.locales
        if not self.default_locales:
            raise ValueError("Default locales are not set")
        return self.default_locales

    def translate(self, localized_text: LocalizedText) -> str:
        locales = self.get_locales()
        if not locales:
            raise RuntimeError("Locales not loaded")
        if isinstance(localized_text, str):
            return localized_text
        translation = self.select_best_translation(locales, localized_text)
        if not translation:
            raise ValueError(f"Missing translation for {locales} in {localized_text}")
        return translation

    def select_best_translation(
        self,
        locales: list[Locale],
        localized_text: LocalizedText,
    ) -> str | None:
        if isinstance(localized_text, str):
            return localized_text
        if not localized_text:
            return None
        translations = localized_text
        for locale in locales:
            translation = translations.get(locale)
            if translation:
                return translation
        translation = next(iter(translations.values()))
        return translation

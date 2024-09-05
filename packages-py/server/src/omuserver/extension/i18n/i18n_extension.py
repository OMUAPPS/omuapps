from omu.extension.i18n.i18n_extension import I18N_LOCALES_REGISTRY_TYPE

from omuserver.server import Server

from .permissions import (
    I18N_GET_LOCALES_PERMISSION,
    I18N_SET_LOCALES_PERMISSION,
)


class I18nExtension:
    def __init__(self, server: Server):
        server.permission_manager.register(
            I18N_GET_LOCALES_PERMISSION,
            I18N_SET_LOCALES_PERMISSION,
        )
        server.registries.register(I18N_LOCALES_REGISTRY_TYPE)

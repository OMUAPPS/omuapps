from __future__ import annotations

from typing import TYPE_CHECKING

from omu.extension.i18n.i18n_extension import I18N_LOCALES_REGISTRY_TYPE

from .permissions import I18N_GET_LOCALES_PERMISSION, I18N_SET_LOCALES_PERMISSION

if TYPE_CHECKING:
    from omuserver.server import Server


class I18nExtension:
    def __init__(self, server: Server):
        server.security.register(
            I18N_GET_LOCALES_PERMISSION,
            I18N_SET_LOCALES_PERMISSION,
        )
        server.registries.register(I18N_LOCALES_REGISTRY_TYPE)

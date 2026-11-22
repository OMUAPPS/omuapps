import { I18N_GET_LOCALES_PERMISSION_ID, I18N_LOCALES_REGISTRY_TYPE, I18N_SET_LOCALES_PERMISSION_ID } from '@omujs/omu/api/i18n';
import { PermissionType } from '@omujs/omu/api/permission';

import type { PermissionManager } from '../../security';
import type { RegistryExtension } from '../registry';

export class I18nExtension {
    private static readonly PERMISSIONS = [
        new PermissionType({
            id: I18N_SET_LOCALES_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: '言語設定を変更', en: 'Change locale settings' },
                note: { ja: 'アプリが言語設定を変更するために使われます', en: 'Used to change locale settings such as language and currency' },
            },
        }),
        new PermissionType({
            id: I18N_GET_LOCALES_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: '言語設定を取得', en: 'Get locale settings' },
                note: { ja: 'アプリが言語設定を取得するために使われます', en: 'Used to get locale settings such as language and currency' },
            },
        }),
    ];

    public constructor(security: PermissionManager, registries: RegistryExtension) {
        security.registerPermission(...I18nExtension.PERMISSIONS);
        registries.register(I18N_LOCALES_REGISTRY_TYPE);
    }
}

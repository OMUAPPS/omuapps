import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const APP_ID = Identifier.fromKey('com.omuapps:obs-sync');
export const APP = new App(APP_ID, {
    url: `${ORIGIN}/app/obs-sync`,
    metadata: {
        locale: 'en',
        name: {
            ja: 'OBS同期プラグイン',
            en: 'OBS Sync Plugin',
        },
        description: {
            ja: 'OBS Studioと同期するプラグインを管理することができます。',
        },
        icon: 'ti-broadcast',
        tags: ['underdevelopment', 'tool'] as TagKey[],
    },
});

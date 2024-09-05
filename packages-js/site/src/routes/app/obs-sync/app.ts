import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';

export const APP_ID = getId('obs-sync');
export const APP = new App(APP_ID, {
    url: getUrl('/app/obs-sync'),
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

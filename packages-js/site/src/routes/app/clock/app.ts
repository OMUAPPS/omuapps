import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'clock');
export const APP = new App(APP_ID, {
    url: getUrl('/app/clock'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: '時計',
            en: 'Clock',
        },
        description: {
            ja: 'ちょっと便利な時計です。',
            en: 'A simple clock.',
        },
        icon: 'ti-clock',
        tags: ['underdevelopment', 'tool', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/clock/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: '時計表示用アセット',
            en: 'Clock Display Asset',
        },
        description: {
            ja: '時計アプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Clock app',
        },
        icon: 'ti-clock',
    }),
});

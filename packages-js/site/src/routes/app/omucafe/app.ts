import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'omucafe');
export const BACKGROUND_ID = APP_ID.join('assets', 'background');
export const OVERLAY_ID = APP_ID.join('assets', 'overlay');

export const OMUCAFE_APP = new App(APP_ID, {
    url: getUrl('/app/omucafe'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: '配信喫茶',
            en: 'Café',
        },
        description: {
            ja: '自分だけのカフェを作ってみよう',
            en: 'Create your own café',
        },
        icon: 'ti-coffee',
        tags: ['underdevelopment', 'game'] as TagKey[],
    }),
});

export const OMUCAFE_OVERLAY_APP = new App(OVERLAY_ID, {
    parentId: OMUCAFE_APP,
    url: getUrl('/app/omucafe/asset/overlay'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'オーバーレイ',
            en: 'Café',
        },
        description: {
            ja: '自分だけのカフェを作ってみよう',
            en: 'Create your own café',
        },
        icon: 'ti-coffee',
        tags: ['underdevelopment', 'game'] as TagKey[],
    }),
});

export const OMUCAFE_BACKGROUND_APP = new App(BACKGROUND_ID, {
    parentId: OMUCAFE_APP,
    url: getUrl('/app/omucafe/asset/background'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: '背景',
            en: 'Café',
        },
        description: {
            ja: '自分だけのカフェを作ってみよう',
            en: 'Create your own café',
        },
        icon: 'ti-coffee',
        tags: ['underdevelopment', 'game'] as TagKey[],
    }),
});

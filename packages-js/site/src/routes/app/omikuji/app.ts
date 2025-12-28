import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'omikuji');
export const OMIKUJI_APP = new App(APP_ID, {
    url: getUrl('/app/omikuji'),
    metadata: buildMetadata({
        locale: 'en',
        name: 'おみくじ',
        description: '今年の運勢',
        icon: 'ti-swipe',
        tags: ['game', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/omikuji/asset'),
    parentId: OMIKUJI_APP,
    metadata: buildMetadata({
        locale: 'en',
        name: 'おみくじ',
        icon: 'ti-swipe',
    }),
});

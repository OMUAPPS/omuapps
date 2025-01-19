import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'omucafe');

export const APP = new App(APP_ID, {
    url: getUrl('/app/omucafe'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'おむカフェ',
            en: 'OMU Café',
        },
        description: {
            ja: '自分だけのカフェを作ってみよう',
            en: 'Create your own café',
        },
        icon: 'ti-coffee',
        tags: ['underdevelopment', 'game'] as TagKey[],
    }),
});

import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'aoikuru-fries');
export const APP = new App(APP_ID, {
    url: getUrl('/app/aoikuru-fries'),
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: 'あおいくる様用待機画面',
            en: 'Aoikuru Fries Waiting Screen',
        },
        description: {
            ja: 'ポテトをあげよう',
            en: 'Let\'s raise potatoes',
        },
        icon: 'ti-photo',
        image: thumbnail,
        tags: ['asset'] as TagKey[],
    }),
});

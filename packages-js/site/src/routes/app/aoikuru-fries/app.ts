import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = getId('aoikuru-fries');
export const APP = new App(APP_ID, {
    url: getUrl('/app/aoikuru-fries'),
    metadata: {
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
        image: getUrl(thumbnail),
        tags: ['asset'] as TagKey[],
    },
});

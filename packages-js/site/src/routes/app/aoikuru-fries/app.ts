import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import thumbnail from './thumbnail.png';

export const IDENTIFIER = new Identifier('omuapps.com', 'aoikuru-fries');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/aoikuru-fries`,
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

import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const IDENTIFIER = new Identifier('com.omuapps', 'aoikuru-fries');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/aoikuru-fries`,
    metadata: {
        locale: 'ja',
        name: {
            ja: 'あおいくる様用待機画面',
        },
        description: {
            ja: 'ポテトをあげる待機画面です。',
        },
        icon: 'ti-photo',
        tags: ['asset'] as TagKey[],
    },
});

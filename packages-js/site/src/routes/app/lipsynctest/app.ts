import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'lipsynctest');
export const APP = new App(APP_ID, {
    url: getUrl('/app/lipsynctest'),
    metadata: {
        locale: 'en',
        name: {
            en: 'Lipsync Test',
            ja: 'リップシンクテスト',
        },
        description: {
            en: 'Lipsync technology test',
            ja: 'リップシンク技術のテスト',
        },
        icon: {
            ja: 'ti-language-katakana',
            en: 'ti-language',
        },
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';

export const APP_ID = getId('lipsynctest');
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

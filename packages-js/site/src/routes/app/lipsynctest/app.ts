import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const IDENTIFIER = new Identifier('omuapps.com', 'lipsynctest');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/lipsynctest`,
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
        icon: 'ti-language-katakana',
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

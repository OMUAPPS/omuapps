import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const APP_ID = new Identifier('com.omuapps', 'roulette');
export const APP = new App(APP_ID, {
    url: `${ORIGIN}/app/roulette`,
    metadata: {
        locale: 'ja',
        name: {
            ja: 'ルーレット',
            en: 'Roulette',
        },
        description: {
            ja: 'ルーレットを回して、誰かを当てたり選択を決めることができます。',
            en: 'An app to spin a roulette and pick someone or make a decision.',
        },
        icon: 'ti-rosette',
        tags: ['asset', 'game', 'tool', 'underdevelopment'] as TagKey[],
    },
});

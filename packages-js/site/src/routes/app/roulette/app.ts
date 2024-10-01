import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'roulette');
export const APP = new App(APP_ID, {
    url: getUrl('/app/roulette'),
    metadata: {
        locale: 'ja',
        name: {
            ja: 'ルーレット',
            en: 'Roulette',
        },
        description: {
            ja: 'ルーレットを回して、誰かを当てたり選択を決めることができます',
            en: 'You can spin the roulette to select someone or make a decision',
        },
        icon: 'ti-rosette',
        image: getUrl(thumbnail),
        tags: ['asset', 'game', 'tool'] as TagKey[],
    },
});

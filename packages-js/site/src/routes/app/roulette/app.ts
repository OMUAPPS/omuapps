import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'roulette');
export const APP = new App(APP_ID, {
    url: getUrl('/app/roulette'),
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: 'ルーレット',
            en: 'Roulette',
        },
        description: {
            ja: 'ルーレットを回して、誰かを当てたり選択を決めることができます',
            en: 'You can spin the roulette to select someone or make a decision',
        },
        icon: 'ti-wheel',
        image: thumbnail,
        tags: ['asset', 'game', 'tool'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/roulette/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: 'ルーレット表示用アセット',
            en: 'Roulette Display Asset',
        },
        description: {
            ja: 'ルーレットアプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Roulette app',
        },
        icon: 'ti-wheel',
    }),
});

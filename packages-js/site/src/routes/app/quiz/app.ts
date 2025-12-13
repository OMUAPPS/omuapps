import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'quiz');

export const QUIZ_APP = new App(APP_ID, {
    url: getUrl('/app/quiz'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'クイズ',
            en: 'quiz',
        },
        description: {
            ja: 'クイズのお時間！',
            en: 'It\'s quiz time!',
        },
        icon: 'ti-letter-q',
        tags: ['asset', 'game', 'underdevelopment'] as TagKey[],
    }),
});
export const QUIZ_ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/quiz/asset'),
    parentId: QUIZ_APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'クイズ',
            en: 'quiz',
        },
        description: {
            ja: 'ゲームアプリ「クイズ」の表示用アセット',
        },
        icon: 'ti-letter-q',
    }),
});

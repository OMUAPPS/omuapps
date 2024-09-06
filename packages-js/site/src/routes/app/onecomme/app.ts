import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'onecomme');
export const APP = new App(APP_ID, {
    url: getUrl('/app/onecomme'),
    metadata: {
        locale: 'en',
        name: {
            en: 'OneComme Integration',
            ja: 'わんコメ連携',
        },
        description: {
            en: 'Display comments in the OneComme template without any settings.',
            ja: '設定無しでコメントをわんコメのテンプレートに表示します。',
        },
        icon: 'ti-dog',
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:onecomme');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/onecomme`,
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

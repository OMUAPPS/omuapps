import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'translator');
export const TRANSLATOR_APP = new App(APP_ID, {
    url: getUrl('/app/translator'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: '構文翻訳',
            en: 'Fun Translator',
        },
        description: {
            ja: '文章を様々な構文に翻訳します。',
            en: 'Translates text.',
        },
        icon: {
            ja: 'ti-language-katakana',
            en: 'ti-language',
        },
        tags: ['tool'] as TagKey[],
    }),
});

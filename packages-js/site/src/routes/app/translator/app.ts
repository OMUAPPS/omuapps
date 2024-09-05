import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'translator');
export const APP = new App(APP_ID, {
    url: getUrl('/app/translator'),
    metadata: {
        locale: 'en',
        name: {
            en: 'Translator',
            ja: '翻訳',
        },
        description: {
            en: 'Translate messages.',
            ja: 'メッセージを翻訳します。',
        },
        icon: getUrl(icon),
        image: getUrl(thumbnail),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

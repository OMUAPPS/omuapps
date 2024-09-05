import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = new Identifier('omuapps.com', 'emoji');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/emoji`,
    metadata: {
        locale: 'en',
        name: {
            en: 'Emoji',
            ja: '絵文字',
        },
        description: {
            en: 'Convert specific strings to emojis.',
            ja: '特定の文字列を絵文字に変換します。',
        },
        icon: getUrl(icon),
        tags: ['underdevelopment'] as TagKey[],
    },
});

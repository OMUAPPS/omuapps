import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'emoji');
export const APP = new App(APP_ID, {
    url: getUrl('/app/emoji'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            en: 'Emoji',
            ja: '絵文字',
        },
        description: {
            en: 'Convert specific strings to emojis.',
            ja: '特定の文字列を絵文字に変換します。',
        },
        icon,
        tags: ['underdevelopment'] as TagKey[],
    }),
});

import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = Identifier.fromKey('omuapps.com:chatsubtitle');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/chatsubtitle`,
    metadata: {
        locale: 'en',
        name: {
            en: 'Chat Subtitle',
            ja: 'チャット字幕',
        },
        description: {
            en: 'Generates subtitles to display chat.',
            ja: 'チャットを表示する字幕を生成します。',
        },
        icon: getUrl(icon),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

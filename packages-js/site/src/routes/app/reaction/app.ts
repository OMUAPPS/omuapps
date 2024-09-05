import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';
import thumbnail from './thumbnail.png';

export const IDENTIFIER = new Identifier('com.omuapps', 'reaction');

export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/reaction`,
    metadata: {
        locale: 'en',
        name: {
            ja: 'リアクション',
            en: 'Reaction',
        },
        description: {
            ja: 'Youtubeのチャットに送られたリアクションを配信画面にも乗せることができます',
            en: 'Display reactions sent to Youtube chat on your stream',
        },
        icon: getUrl(icon),
        image: getUrl(thumbnail),
        tags: ['youtube', 'asset'] as TagKey[],
    },
});

import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import icon from './icon.png';
import thumbnail from './thumbnail.png';

export const APP_ID = getId('reaction');

export const APP = new App(APP_ID, {
    url: getUrl('/app/reaction'),
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

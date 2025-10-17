import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'reaction');

export const APP = new App(APP_ID, {
    url: getUrl('/app/reaction'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リアクション',
            en: 'Reaction',
        },
        description: {
            ja: 'Youtubeのチャットに送られたリアクションを配信画面にも乗せることができます',
            en: 'Display reactions sent to Youtube chat on your stream',
        },
        icon,
        image: thumbnail,
        tags: ['youtube', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/reaction'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リアクション',
            en: 'Reaction',
        },
        description: {
            ja: 'Youtubeのチャットに送られたリアクションを配信画面にも乗せることができます',
            en: 'Display reactions sent to Youtube chat on your stream',
        },
        icon,
    }),
});

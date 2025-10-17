import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'discord-overlay');
export const APP = new App(APP_ID, {
    url: getUrl('/app/discord-overlay'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'Discordオーバーレイ',
            en: 'Discord Overlay',
        },
        description: {
            ja: '配信にdiscordの通話を映すことができます',
            en: 'Show discord voice chat on your stream',
        },
        icon: 'ti-brand-discord',
        tags: ['tool', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/discord-overlay/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'Discordオーバーレイ表示用アセット',
            en: 'Discord Overlay Display Asset',
        },
        description: {
            ja: 'Discordオーバーレイアプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Discord Overlay app',
        },
        icon: 'ti-brand-discord',
    }),
});

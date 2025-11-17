import { VERSION } from '$lib/version.js';
import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { APP_INDEX, buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'discord-overlay');
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/discord-overlay/asset'),
    parentId: APP_ID,
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
export const DISCORD_PLUGIN_APP = new App(new Identifier(NAMESPACE, 'plugin-discordrpc'), {
    url: getUrl('/app/discord-overlay/plugin'),
    type: 'service',
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            'ja-JP': 'Discord RPCプラグイン',
            'en-US': 'Discord RPC Plugin',
        },
    }),
});

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
    dependencies: {
        [DISCORD_PLUGIN_APP.id.key()]: {
            version: VERSION,
            index: APP_INDEX,
        },
    },
});

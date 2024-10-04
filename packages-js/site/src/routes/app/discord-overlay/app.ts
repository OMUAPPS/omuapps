import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'discord-overlay');
export const APP = new App(APP_ID, {
    url: getUrl('/app/discord-overlay'),
    metadata: {
        locale: 'en',
        name: {
            ja: 'Discordオーバーレイ',
            en: 'Discord Overlay',
        },
        description: {
            ja: 'ボイスチャットをいい感じに配信画面に',
        },
        icon: 'ti-brand-discord',
        tags: ['tool', 'asset'] as TagKey[],
    },
});

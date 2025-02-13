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

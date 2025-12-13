import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'chat-overlay');
export const CHAT_OVERLAY_APP = new App(APP_ID, {
    url: getUrl('/app/chat-overlay'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'チャットオーバーレイ',
            en: 'Chat Overlay',
        },
        description: {
            ja: 'チャットを画面に表示します',
            en: 'Display the chat in the screen',
        },
        icon: 'ti-message-2',
        tags: ['underdevelopment', 'tool', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/chat-overlay/asset'),
    parentId: CHAT_OVERLAY_APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'チャット表示用アセット',
            en: 'Chat Display Asset',
        },
        icon: 'ti-message-2',
    }),
});

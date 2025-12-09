import { VERSION_MINOR } from '$lib/version.js';
import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { DISCORD_PLUGIN_APP } from '../discord-overlay/app.js';
import { APP_INDEX, buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'video-overlay');

export const VIDEO_OVERLAY_APP = new App(APP_ID, {
    url: getUrl('/app/video-overlay'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'ビデオオーバーレイ',
            en: 'Video Overlay',
        },
        description: {
            ja: '画面を配信に重ねて表示できるオーバーレイアプリ',
            en: 'An overlay app that can be displayed over the screen for streaming',
        },
        icon: 'ti-video',
        tags: ['asset', 'tool', 'underdevelopment'] as TagKey[],
    }),
    dependencies: {
        [DISCORD_PLUGIN_APP.id.key()]: {
            version: VERSION_MINOR,
            index: APP_INDEX,
        },
    },
});
export const VIDEO_OVERLAY_ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/video-overlay/asset'),
    parentId: VIDEO_OVERLAY_APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'ビデオオーバーレイ表示用アセット',
            en: 'Video Overlay Display Asset',
        },
        description: {
            ja: 'ビデオオーバーレイアプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Video Overlay app',
        },
        icon: 'ti-video',
    }),
});

import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'replay');
export const APP = new App(APP_ID, {
    url: getUrl('/app/replay'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リプレイ',
            en: 'Replay',
        },
        description: {
            ja: '過去の配信や動画を配信に写しながら再生することができます',
            en: 'Play past streams or videos on your stream',
        },
        icon,
        tags: ['tool', 'youtube', 'asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/replay/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リプレイ表示用アセット',
            en: 'Replay Display Asset',
        },
        description: {
            ja: 'リプレイアプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Replay app',
        },
        icon,
    }),
});

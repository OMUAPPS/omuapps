import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'timer');

export const APP = new App(APP_ID, {
    url: getUrl('/app/timer'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'タイマー',
            en: 'Timer',
        },
        description: {
            ja: '時間を計測するためのシンプルなタイマーアプリ',
            en: 'A simple timer app to measure time',
        },
        icon: 'ti-alarm',
        image: thumbnail,
        tags: ['asset', 'tool'] as TagKey[],
    }),
});
export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/timer/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'タイマー表示',
            en: 'Timer',
        },
        description: {
            ja: 'タイマーアプリの表示用アセット',
            en: 'An asset for displaying the timer app',
        },
        icon: 'ti-alarm',
    }),
});

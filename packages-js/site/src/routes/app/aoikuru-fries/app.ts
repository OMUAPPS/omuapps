import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

const id = new Identifier(NAMESPACE, 'aoikuru-fries');
export const APP = new App(id, {
    url: getUrl('/app/aoikuru-fries'),
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: 'あおいくる様用待機画面',
            en: 'Aoikuru Fries Waiting Screen',
        },
        description: {
            ja: 'ポテトをあげよう',
            en: 'Let\'s raise potatoes',
        },
        icon: 'ti-photo',
        image: thumbnail,
        tags: ['asset'] as TagKey[],
    }),
});
export const ASSET_APP = new App(id.join('asset'), {
    url: getUrl('/app/aoikuru-fries/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: 'あおいくる様用待機画面表示用アセット',
            en: 'Aoikuru Fries Waiting Screen Display Asset',
        },
        description: {
            ja: 'あおいくる様用待機画面アプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Aoikuru Fries Waiting Screen app',
        },
        icon: 'ti-photo',
    }),
});

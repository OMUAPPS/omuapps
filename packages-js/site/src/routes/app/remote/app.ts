import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'remote');
export const APP = new App(APP_ID, {
    url: getUrl('/app/remote'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リモート',
            en: 'Remote',
        },
        description: {
            ja: 'スマホや外部のデバイスから操作することができます',
            en: 'You can control it from your smartphone or external device',
        },
        icon: 'ti-access-point',
        tags: ['tool', 'asset'] as TagKey[],
    }),
});

export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/remote/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リモート表示用アセット',
            en: 'Remote Display Asset',
        },
        description: {
            ja: 'リモートアプリで使用する表示用アセットです',
            en: 'This is a display asset used in the Remote app',
        },
        icon: 'ti-access-point',
    }),
});

export const REMOTE_APP = new App(APP_ID.join('session'), {
    url: getUrl('/app/remote/session'),
    type: 'remote',
    parentId: APP,
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リモート操作',
            en: 'Remote Control',
        },
        description: {
            ja: '外部から操作するためのセッションを開始します',
            en: 'Start a session to control from the outside',
        },
        icon: 'ti-access-point',
    }),
});

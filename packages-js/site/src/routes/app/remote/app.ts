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

export const REMOTE_APP_ID = new Identifier(NAMESPACE, 'remote', 'session');
export const REMOTE_APP = new App(REMOTE_APP_ID, {
    url: getUrl('/app/remote/session'),
    type: 'remote',
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

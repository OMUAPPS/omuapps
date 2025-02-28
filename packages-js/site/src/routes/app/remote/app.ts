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
        },
        tags: ['tool', 'asset'] as TagKey[],
    }),
});

export const REMOTE_APP_ID = new Identifier(NAMESPACE, 'remote', 'session');
export const REMOTE_APP = new App(APP_ID, {
    url: getUrl('/app/remote/session'),
    type: 'remote',
    metadata: buildMetadata({
        locale: 'en',
        name: {
            ja: 'リモート',
            en: 'Remote',
        },
        description: {
        },
    }),
});

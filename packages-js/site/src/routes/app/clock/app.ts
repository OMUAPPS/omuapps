import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'clock');
export const APP = new App(APP_ID, {
    url: getUrl('/app/clock'),
    metadata: {
        locale: 'en',
        name: {
            ja: '時計',
            en: 'Clock',
        },
        description: {
            ja: 'ちょっと便利な時計です。',
            en: 'A simple clock.',
        },
        icon: 'ti-clock',
        tags: ['underdevelopment', 'tool', 'asset'] as TagKey[],
    },
});

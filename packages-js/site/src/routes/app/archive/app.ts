import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'archive');
export const APP = new App(APP_ID, {
    url: getUrl('/app/archive'),
    metadata: {
        locale: 'en',
        name: {
            ja: 'アーカイブ',
            en: 'Archive',
        },
        description: {
            ja: '配信を自動的に保存することができます',
            en: 'Automatically save your streams',
        },
        icon: getUrl(icon),
        tags: ['tool'] as TagKey[],
    },
});

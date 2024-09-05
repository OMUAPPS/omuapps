import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import icon from './icon.png';

export const APP_ID = getId('archive');
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

import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:archive');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/archive`,
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

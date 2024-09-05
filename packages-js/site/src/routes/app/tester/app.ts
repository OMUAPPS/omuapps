import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = new Identifier('com.omuapps', 'tester');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/tester`,
    metadata: {
        locale: 'en',
        name: {
            en: 'Tester',
            ja: 'コメントテスター',
        },
        description: {
            en: 'Test comments.',
            ja: 'コメントのテストをします。',
        },
        icon: getUrl(icon),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

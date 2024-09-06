import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'tester');
export const APP = new App(APP_ID, {
    url: getUrl('/app/tester'),
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

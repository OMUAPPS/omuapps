import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'playqueue');
export const APP = new App(APP_ID, {
    url: getUrl('/app/playqueue'),
    metadata: {
        locale: 'en',
        name: 'Play Queue',
        icon: getUrl(icon),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

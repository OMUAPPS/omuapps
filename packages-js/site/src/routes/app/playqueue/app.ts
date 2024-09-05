import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = new Identifier('omuapps.com', 'playqueue');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/playqueue`,
    metadata: {
        locale: 'en',
        name: 'Play Queue',
        icon: getUrl(icon),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

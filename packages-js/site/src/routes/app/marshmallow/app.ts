import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = Identifier.fromKey('com.omuapps:marshmallow');
export const APP = new App(APP_ID, {
    url: `${ORIGIN}/app/marshmallow`,
    metadata: {
        locale: 'en',
        name: {
            ja: 'マシュマロ読み',
            en: 'Marshmallow Reader',
        },
        description: {
            ja: '面倒なことなくマシュマロを読むことができます',
            en: 'Read marshmallows without any hassle',
        },
        icon: 'ti-notes',
        image: getUrl(thumbnail),
        tags: ['tool'] as TagKey[],
    },
});

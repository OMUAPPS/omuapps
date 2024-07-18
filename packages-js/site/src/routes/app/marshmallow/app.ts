import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';
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
            ja: '面倒なことなくマシュマロを読むことが出来ます',
            en: 'You can read marshmallow without any hassle',
        },
        icon: 'ti-notes',
        image: thumbnail,
        tags: ['tool'] as TagKey[],
    },
});

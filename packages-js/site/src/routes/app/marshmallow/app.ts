import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';

export const APP_ID = Identifier.fromKey('com.omuapps:marshmallow');
export const APP = new App(APP_ID, {
    url: `${ORIGIN}/app/marshmallow`,
    metadata: {
        locale: 'en',
        name: {
            en: 'Marshmallow Integration',
            ja: 'マシュマロ読み',
        },
        description: {
            en: 'An app to read marshmallow without any hassle.',
            ja: '面倒なことなしにマシュマロを配信に写しながら読むためのアプリ',
        },
        icon: 'ti-notes',
        tags: ['tool'] as TagKey[],
    },
});

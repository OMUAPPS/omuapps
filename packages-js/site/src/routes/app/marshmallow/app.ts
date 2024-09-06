import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = new Identifier(NAMESPACE, 'marshmallow');
export const APP = new App(APP_ID, {
    url: getUrl('/app/marshmallow'),
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

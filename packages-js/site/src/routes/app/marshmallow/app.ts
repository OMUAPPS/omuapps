import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import thumbnail from './thumbnail.png';

export const APP_ID = getId('marshmallow');
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

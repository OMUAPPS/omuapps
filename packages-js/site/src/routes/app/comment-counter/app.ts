import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';

export const APP_ID = new Identifier(NAMESPACE, 'comment-counter');
export const APP = new App(APP_ID, {
    url: getUrl('/app/comment-counter'),
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: '\u30b3\u30e1\u30f3\u30c8\u30ab\u30a6\u30f3\u30bf\u30fc',
            en: 'Comment Counter',
        },
        description: {
            ja: '\u73fe\u5728\u63a5\u7d9a\u3057\u3066\u3044\u308b\u914d\u4fe1\u306e\u30b3\u30e1\u30f3\u30c8\u6570\u3092\u6570\u3048\u307e\u3059\u3002',
            en: 'Counts comments from currently connected streams.',
        },
        icon: 'ti-message-2',
        tags: ['tool', 'underdevelopment'] as TagKey[],
    }),
});

export const ASSET_APP = new App(APP_ID.join('asset'), {
    url: getUrl('/app/comment-counter/asset'),
    parentId: APP,
    metadata: buildMetadata({
        locale: 'ja',
        name: {
            ja: '\u30b3\u30e1\u30f3\u30c8\u30ab\u30a6\u30f3\u30bf\u30fc\u8868\u793a',
            en: 'Comment Counter Display',
        },
        description: {
            ja: '\u914d\u4fe1\u30bd\u30d5\u30c8\u306b\u30b3\u30e1\u30f3\u30c8\u6570\u3092\u8868\u793a\u3057\u307e\u3059\u3002',
            en: 'Displays the comment count in streaming software.',
        },
        icon: 'ti-message-2',
    }),
});

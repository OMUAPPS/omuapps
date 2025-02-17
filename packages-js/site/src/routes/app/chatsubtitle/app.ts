import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { buildMetadata, getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'chatsubtitle');
export const APP = new App(APP_ID, {
    url: getUrl('/app/chatsubtitle'),
    metadata: buildMetadata({
        locale: 'en',
        name: {
            en: 'Chat Subtitle',
            ja: 'チャット字幕',
        },
        description: {
            en: 'Generates subtitles to display chat.',
            ja: 'チャットを表示する字幕を生成します。',
        },
        icon,
        tags: ['tool', 'underdevelopment'] as TagKey[],
    }),
});

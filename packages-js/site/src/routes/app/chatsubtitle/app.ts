import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import icon from './icon.png';

export const APP_ID = getId('chatsubtitle');
export const APP = new App(APP_ID, {
    url: getUrl('/app/chatsubtitle'),
    metadata: {
        locale: 'en',
        name: {
            en: 'Chat Subtitle',
            ja: 'チャット字幕',
        },
        description: {
            en: 'Generates subtitles to display chat.',
            ja: 'チャットを表示する字幕を生成します。',
        },
        icon: getUrl(icon),
        tags: ['tool', 'underdevelopment'] as TagKey[],
    },
});

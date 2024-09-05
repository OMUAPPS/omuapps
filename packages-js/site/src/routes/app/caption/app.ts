import { App, Identifier } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getUrl, NAMESPACE } from '../origin.js';
import icon from './icon.png';

export const APP_ID = new Identifier(NAMESPACE, 'caption');
export const APP = new App(APP_ID, {
    url: getUrl('/app/caption'),
    metadata: {
        locale: 'en',
        name: {
            ja: 'リアルタイム字幕',
            en: 'Real-time Caption',
        },
        description: {
            ja: '喋った内容をリアルタイムで配信に表示することができます',
            en: 'Display spoken content in real time on your stream',
        },
        icon: getUrl(icon),
        tags: ['tool', 'asset'] as TagKey[],
    },
});

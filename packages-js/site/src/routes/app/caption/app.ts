import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = new Identifier('omuapps.com', 'caption');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/caption`,
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

import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';
import icon from './icon.png';

export const APP_ID = getId('replay');
export const APP = new App(APP_ID, {
    url: getUrl('/app/replay'),
    metadata: {
        locale: 'en',
        name: {
            ja: 'リプレイ',
            en: 'Replay',
        },
        description: {
            ja: '過去の配信や動画を配信に写しながら再生することができます',
            en: 'Play past streams or videos on your stream',
        },
        icon: getUrl(icon),
        tags: ['tool', 'youtube', 'asset'] as TagKey[],
    },
});

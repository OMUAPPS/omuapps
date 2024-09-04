import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:replay');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/replay`,
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

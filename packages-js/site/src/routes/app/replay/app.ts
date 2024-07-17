import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { ORIGIN } from '../origin.js';
import icon from './icon.png';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:replay');
export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/replay`,
    metadata: {
        locale: 'en',
        name: {
            en: 'Replay',
            ja: 'リプレイ',
        },
        description: {
            en: 'Replay live streams.',
            ja: '動画や過去の配信を配信画面に写しながら再生することができます。',
        },
        icon: icon,
        tags: ['tool', 'youtube', 'asset'] as TagKey[],
    },
});

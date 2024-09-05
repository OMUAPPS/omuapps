import { App } from '@omujs/omu';
import { Identifier } from '@omujs/omu/identifier.js';
import type { TagKey } from '../category.js';
import { getUrl, ORIGIN } from '../origin.js';
import thumbnail from './thumbnail.png';

export const IDENTIFIER = new Identifier('com.omuapps', 'timer');

export const APP = new App(IDENTIFIER, {
    url: `${ORIGIN}/app/timer`,
    metadata: {
        locale: 'en',
        name: {
            ja: 'タイマー',
            en: 'Timer',
        },
        description: {
            ja: '時間を計測するためのシンプルなタイマーアプリ',
            en: 'A simple timer app to measure time',
        },
        icon: 'ti-alarm',
        image: getUrl(thumbnail),
        tags: ['asset', 'tool'] as TagKey[],
    },
});

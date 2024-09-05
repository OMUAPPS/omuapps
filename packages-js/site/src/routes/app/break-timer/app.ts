import { App } from '@omujs/omu';
import type { TagKey } from '../category.js';
import { getId, getUrl } from '../origin.js';

export const APP_ID = getId('break-timer');
export const APP = new App(APP_ID, {
    url: getUrl('/app/break-timer'),
    metadata: {
        locale: 'en',
        name: {
            ja: '休憩タイマー',
            en: 'Break Time Timer',
        },
        description: {
            ja: '時間を決めてひと休憩',
            en: 'Take a break with a set time',
        },
        icon: 'ti-clock-pause',
        tags: ['underdevelopment', 'tool', 'asset'] as TagKey[],
    },
});

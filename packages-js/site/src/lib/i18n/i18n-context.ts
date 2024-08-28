import type { I18n, TranslateFunction } from '@omujs/i18n';
import { translate } from '@omujs/ui';
import { writable, type Writable } from 'svelte/store';

export const i18n: Writable<I18n | null> = writable(null);

export const t: Writable<TranslateFunction> = writable(() => {
    throw new Error('i18n is not initialized');
});

i18n.subscribe((i18n) => {
    if (i18n) {
        translate.set(i18n.translate);
        t.set(i18n.translate);
    }
});

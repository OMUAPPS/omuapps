import { i18n, type TranslateFunction } from '@omujs/i18n';
import { writable, type Writable } from 'svelte/store';

export const t: Writable<TranslateFunction> = writable(() => {
    throw new Error('Translation function is not initialized yet.');
});
i18n.subscribe((i18n) => {
    t.set(i18n.translate.bind(i18n));
});

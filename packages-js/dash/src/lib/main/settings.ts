import { writable } from 'svelte/store';

import { LOCALES } from '$lib/i18n/i18n.js';

function getSystemLanguage(): keyof typeof LOCALES {
    if (typeof window === 'undefined') {
        return 'ja-JP';
    }
    for (const lang of window.navigator.languages) {
        for (const [key, { alias }] of Object.entries(LOCALES)) {
            if (alias.includes(lang)) {
                return key as keyof typeof LOCALES;
            }
        }
    }
    return 'ja-JP';
}

export function createSetting<T>(key: string, defaultValue: T) {
    if (typeof localStorage === 'undefined') {
        return writable<T>(defaultValue);
    }
    let value = localStorage.getItem(key);
    if (value) {
        try {
            value = JSON.parse(value);
        } catch (e) {
            console.error(e);
            localStorage.removeItem(key);
        }
    }
    const store = writable<T>(
        localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : defaultValue,
    );
    store.subscribe((value) => localStorage.setItem(key, JSON.stringify(value)));
    return store;
}

const systemLanguage = getSystemLanguage();
export const language = createSetting<keyof typeof LOCALES>('language', systemLanguage);
export const devMode = createSetting('devMode', false);
export const currentPage = createSetting('currentPage', 'explore');
export const currentSettingsCategory = createSetting('currentPageSettings', 'general');
export const isBetaEnabled = createSetting('isBetaEnabled', false);
export const installed = createSetting('installed', false);
export const menuOpen = createSetting('menuOpen', false);

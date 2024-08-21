import { writable } from 'svelte/store';

import { LOCALES } from '$lib/i18n/i18n.js';
import type { TypedComponent } from '@omujs/ui';
import Checkbox from './settings/CheckboxField.svelte';
import Combobox from './settings/ComboboxField.svelte';
import About from './settings/about/About.svelte';

function getSystemLanguage(): keyof typeof LOCALES {
    if (typeof window === 'undefined') {
        return 'ja-JP';
    }
    if (window.navigator.language in LOCALES) {
        return window.navigator.language as keyof typeof LOCALES;
    }
    for (const lang of window.navigator.languages) {
        if (lang in LOCALES) {
            return lang as keyof typeof LOCALES;
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
export const installed = createSetting('installed', false);

function calcLanguageScore(lang: string): number {
    let score = 0;
    score +=
        window.navigator.languages.indexOf(lang) === -1
            ? 0
            : window.navigator.languages.indexOf(lang);
    score = window.navigator.language === lang ? 100 : 0;
    ['en', 'zh', 'fr', 'de', 'it', 'pt', 'ro', 'ru', 'ro', 'es', 'sv'].forEach((pair) => {
        if (lang.startsWith(pair) && window.navigator.language.startsWith(pair)) {
            score += 10;
        }
    });

    return score;
}

type Setting<T extends Record<string, unknown> = Record<string, unknown>> = {
    component: TypedComponent<T>;
    props: T;
};
export const SETTING_REGISTRY: Map<string, Record<string, Setting>> = new Map();

export function registerSetting<T extends Record<string, unknown>>(
    category: string,
    key: string,
    setting: TypedComponent<T>,
    props: T,
) {
    if (!SETTING_REGISTRY.has(category)) {
        SETTING_REGISTRY.set(category, {});
    }
    const categorySettings = SETTING_REGISTRY.get(category);
    if (!categorySettings) {
        return;
    }
    categorySettings[key] = {
        component: setting,
        props,
    } as Setting<T>;
}

registerSetting('general', 'devMode', Checkbox, {
    label: 'settings.setting.devMode',
    value: devMode,
});
registerSetting('language', 'language', Combobox, {
    label: 'settings.setting.language',
    value: language,
    options: Object.keys(LOCALES).sort(
        (a, b) => calcLanguageScore(b) - calcLanguageScore(a),
    ) as (keyof typeof LOCALES)[],
});
registerSetting('about', 'licenses', About, {});

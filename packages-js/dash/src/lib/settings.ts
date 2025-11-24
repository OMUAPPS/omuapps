import { LOCALES } from '$lib/i18n/i18n.js';
import { linkOpenHandler } from '@omujs/ui';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { writable, type Writable } from 'svelte/store';

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

import { load } from '@tauri-apps/plugin-store';

const settings = await load('settings.json');

export function createSetting<T>(key: string, defaultValue: T): Writable<T> & { loaded: Promise<void> } {
    const store = writable<T>(defaultValue);
    let loaded = false;
    const wait = settings.get<T>(key).then(async (value) => {
        store.set(value ?? defaultValue);
        loaded = true;
    });
    store.subscribe(async (updated) => {
        if (!loaded) return;
        settings.set(key, updated);
        await settings.save();
    });
    return {
        ...store,
        loaded: wait,
    };
}

const systemLanguage = getSystemLanguage();
export const language = createSetting<keyof typeof LOCALES>('language', systemLanguage);
export const devMode = createSetting('devMode', false);
export const currentPage = createSetting('currentPage', 'explore');
export const lastApp = createSetting<string | null>('lastApp', null);
export const currentSettingsCategory = createSetting('currentPageSettings', 'general');
export const isBetaEnabled = createSetting('isBetaEnabled', false);
export const installed = createSetting('installed', false);
export const menuOpen = createSetting('menuOpen', true);
export const speechRecognition = createSetting('speechRecognition', false);
export type OpenLinkMode = 'browser' | 'window';
export const keepOpenOnBackground = createSetting('keepOpenOnBackground', false);
export const openLinkMode = createSetting<OpenLinkMode>('openLink', 'browser');

openLinkMode.subscribe((value) => {
    if (value === 'browser') {
        linkOpenHandler.set(() => false);
    } else {
        linkOpenHandler.set((href) => {
            const alphanumericHref = href.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const label = `browser-${alphanumericHref}-${Date.now()}`;
            const webviewWindow = new WebviewWindow(label, {
                url: href,
            });
            webviewWindow.setAutoResize(true);
            webviewWindow.once('tauri://close-requested', () => {
                webviewWindow.destroy();
            });
            webviewWindow.show();
            return true;
        });
    }
});

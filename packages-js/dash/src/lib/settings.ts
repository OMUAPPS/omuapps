import { linkOpenHandler } from '@omujs/ui';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { writable, type Writable } from 'svelte/store';

import { i18n, LOCALES, SYSTEM_LANGUAGE, type LocaleCode } from '@omujs/i18n';
import { load } from '@tauri-apps/plugin-store';

const settings = await load('settings.json');

/**
 * Creates a settings store with debounced persistence.
 * Updates are batched together with a 500ms delay to reduce file writes.
 */
export function createSetting<T>(key: string, defaultValue: T): Writable<T> & { loaded: Promise<void> } {
    const store = writable<T>(defaultValue);
    let loaded = false;
    let saveTimeout: NodeJS.Timeout | null = null;

    const wait = settings.get<T>(key).then(async (value) => {
        store.set(value ?? defaultValue);
        loaded = true;
    });

    /**
     * Schedules a save with debouncing to batch multiple updates.
     */
    const scheduleSync = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await settings.save();
            saveTimeout = null;
        }, 500);
    };

    store.subscribe(async (updated) => {
        if (!loaded) return;
        await settings.set(key, updated);
        scheduleSync();
    });

    return {
        ...store,
        loaded: wait,
    };
}

export const language = createSetting<LocaleCode>('language', SYSTEM_LANGUAGE);
export const devMode = createSetting('devMode', false);
export const currentPage = createSetting('currentPage', 'explore');
export const lastApp = createSetting<string | null>('lastApp', null);
export const currentSettingsCategory = createSetting('currentPageSettings', 'general');
export const isBetaEnabled = createSetting('isBetaEnabled', false);
export const installed = createSetting('installed', false);
export const menuOpen = createSetting('menuOpen', true);
export const managingApps = createSetting('managingApps', false);
export const speechRecognition = createSetting('speechRecognition', false);
export type OpenLinkMode = 'browser' | 'window';
export const keepOpenOnBackground = createSetting('keepOpenOnBackground', false);
export const openLinkMode = createSetting<OpenLinkMode>('openLink', 'browser');

/**
 * Opens a link in a new Tauri webview window.
 * Cleans up window when closed.
 */
function openLinkInWindow(href: string): boolean {
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
}

/**
 * Configures link open behavior based on user preference.
 * Links can open in default browser or in a dedicated webview window.
 */
function setLinkOpenHandler(mode: OpenLinkMode) {
    if (mode === 'browser') {
        linkOpenHandler.set(() => false);
    } else {
        linkOpenHandler.set(openLinkInWindow);
    }
}

openLinkMode.subscribe(setLinkOpenHandler);

language.subscribe((code) => {
    i18n.set(LOCALES[code].i18n);
});

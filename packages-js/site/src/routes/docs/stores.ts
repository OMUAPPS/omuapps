import { writable } from 'svelte/store';
import type { DocsData } from './server';

export const docs = writable<DocsData | null>(null);

function createSetting<T>(key: string, defaultValue: T) {
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

export const openedGroups = createSetting<string[]>('site/docs/opened_groups', []);
export const menuOpen = createSetting('site/docs/menu_open', true);

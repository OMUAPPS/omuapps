import type { Component } from 'svelte';
import { get, writable } from 'svelte/store';
import { currentPage } from '../settings.js';

export type Page<T> = {
    component: Component<{
        data: T;
    }, object, ''>;
    data: T;
};

export type PageItem<T> = {
    id: string;
    open(): Promise<Page<T>>;
};

export const pageMap = writable<Record<string, PageItem<unknown>>>({});
export const pages = writable<Record<string, {
    type: 'waiting';
} | {
    type: 'unloaded';
} | {
    type: 'loading';
} | {
    type: 'loaded';
    page: Page<any>;
}>>({});

export function registerPage<Props, T extends PageItem<Props> = PageItem<Props>>(page: T): T {
    if (get(pageMap)[page.id]) {
        return page;
    }
    pageMap.update((map) => {
        map[page.id] = page as PageItem<unknown>;
        return map;
    });
    return page;
}

export function unregisterPage(id: string) {
    pageMap.update((map) => {
        delete map[id];
        return map;
    });
    pages.update((map) => {
        delete map[id];
        return map;
    });
}

export function setPage(id: string) {
    currentPage.set(id);
}

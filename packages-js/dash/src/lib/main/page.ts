import type { Component } from 'svelte';
import { get, writable } from 'svelte/store';
import { currentPage } from '../settings.js';

export type PageItem<T> = {
    id: string;
    component: Component<{
        data: T;
    }, object, ''>;
    data: T;
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
    page: PageItem<any>;
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

export function loadPage(id: string, page: PageItem<any>) {
    pages.update((pages) => {
        if (pages[id] && pages[id].type === 'loaded') return pages;
        pages[id] = { type: 'loading' };
        console.log('loading', id);
        return pages;
    });
    pages.update((pages) => {
        pages[id] = { type: 'loaded', page };
        console.log('loaded', id);
        return pages;
    });
}

export function closePage(id: string) {
    pages.update((pages) => {
        delete pages[id];
        return pages;
    });
}

currentPage.subscribe((value) => {
    const pageItem = get(pageMap)[value];
    if (!pageItem) {
        pages.update((pages) => {
            pages[value] = { type: 'waiting' };
            return pages;
        });
        console.log('waiting', value);
        return;
    }
    loadPage(value, pageItem);
});
pageMap.subscribe((value) => {
    const current = get(currentPage);
    const page = get(pages)[current];
    if (!page || page.type !== 'waiting') return;
    if (!value[current]) return;
    const pageItem = value[current];
    loadPage(current, pageItem);
});

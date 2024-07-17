import type { TypedComponent } from '@omujs/ui';
import { writable } from 'svelte/store';
import { currentPage } from './settings.js';

export type Page<T> = {
    component: TypedComponent<{
        props: T;
    }>;
    props: T;
};

export type PageItem<T> = {
    id: string;
    open(): Promise<Page<T>>;
};

export const pageMap = writable<Record<string, PageItem<unknown>>>({});
export const loadedIds = writable<string[]>([]);

export function registerPage<Props, T extends PageItem<Props>>(page: T): T {
    pageMap.update((map) => {
        map[page.id] = page as PageItem<unknown>;
        return map;
    });
    return page;
}

export function setPage(id: string) {
    currentPage.set(id);
    loadedIds.update((ids) => {
        if (!ids.includes(id)) {
            ids.push(id);
        }
        return ids;
    });
}

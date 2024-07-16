import type { TypedComponent } from '@omujs/ui';
import { writable } from 'svelte/store';

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

export const page = writable<PageItem<unknown> | null>(null);
export const loadedIds = writable<string[]>([]);
export const menuOpen = writable(true);

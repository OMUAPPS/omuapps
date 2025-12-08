import type { Component } from 'svelte';
import { writable } from 'svelte/store';

export type ScreenHandle = {
    id: number;
    close: () => void;
};

export type ScreenComponentType<T> = Component<{
    handle: ScreenHandle;
    props: T;
}, object, ''>;

export interface ScreenEntry<T> {
    id: number;
    target: string;
    component: ScreenComponentType<T>;
    props: T;
}

let id = 0;
export const screenEntries = writable<ScreenEntry<unknown>[]>([]);

export function pushScreen<T>(component: ScreenComponentType<T>, target: string, props: T) {
    screenEntries.update((entries) => {
        const newId = id++;
        entries.push({
            id: newId,
            target,
            component: component as ScreenComponentType<unknown>,
            props,
        });
        return entries;
    });
}

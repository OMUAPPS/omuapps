import type { TypedComponent } from '@omuchatjs/ui';
import { writable } from 'svelte/store';

export type ScreenHandle = {
    id: number;
    pop: () => void;
};

export type ScreenComponentType<T> = TypedComponent<{
    screen: {
        handle: ScreenHandle;
        props: T;
    };
}>;

export interface ScreenComponent<T> {
    id: number;
    component: ScreenComponentType<T>;
    props: T;
}

let id = 0;
const stack = writable<Map<number, ScreenComponent<unknown>>>(new Map());
const current = writable<ScreenComponent<unknown> | null>(null);
stack.subscribe((stack) => {
    const last = Array.from(stack.values()).pop() || null;
    current.set(last);
});

function push<T>(component: ScreenComponentType<T>, props: T) {
    stack.update((stack) => {
        const newId = id++;
        stack.set(newId, {
            id: newId,
            component: component as ScreenComponentType<unknown>,
            props,
        });
        return stack;
    });
}

function pop(id: number) {
    stack.update((stack) => {
        stack.delete(id);
        return stack;
    });
}

export const screenContext = {
    push,
    pop,
    current,
    stack,
};

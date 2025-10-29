import { writable } from 'svelte/store';

export const hasPremium = writable<boolean | undefined>();

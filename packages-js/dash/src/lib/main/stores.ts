import { writable } from 'svelte/store';

export const page = writable<string | null>(null);

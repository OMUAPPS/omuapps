import { writable } from 'svelte/store';

export const heldAvatar = writable<string | null>(null);
export const dragUser = writable<string | null>(null);
export const heldUser = writable<string | null>(null);

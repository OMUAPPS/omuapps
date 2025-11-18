import { writable } from 'svelte/store';

export const selectedQuizzes = writable<Record<string, boolean>>({});

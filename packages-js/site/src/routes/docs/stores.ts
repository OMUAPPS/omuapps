import type { DocsData } from '$lib/server/docs';
import { writable } from 'svelte/store';

export const docs = writable<DocsData | null>(null);

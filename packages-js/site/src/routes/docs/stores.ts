import type { DocsData } from '$lib/server/docs/index.js';
import { writable } from 'svelte/store';

export const docs = writable<DocsData | null>(null);

import type { App } from '@omujs/omu';
import { writable } from 'svelte/store';

export const selectedApp = writable<App | undefined>();

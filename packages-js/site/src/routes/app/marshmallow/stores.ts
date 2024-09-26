import { writable } from 'svelte/store';
import type { Message } from './marshmallow-app.js';

export const selectedMessageId = writable<string | undefined>();
export const selectMessage = writable<(message: Message) => void>();

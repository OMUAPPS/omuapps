import type { Room } from '@omujs/chat/models';
import { writable, type Writable } from 'svelte/store';

export const createSubtitle: Writable<(room: Room) => Promise<void>> = writable();

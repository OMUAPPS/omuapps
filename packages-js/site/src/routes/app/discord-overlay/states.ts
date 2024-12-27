import { Vec2 } from '$lib/math/vec2.js';
import { writable } from 'svelte/store';

export const selectedAvatar = writable<string | null>(null);
export const dragUser = writable<string | null>(null);
export const dragPosition = writable<Vec2>(Vec2.ZERO);
export const heldUser = writable<string | null>(null);

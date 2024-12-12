import { writable } from 'svelte/store';
import type { Avatar, AvatarContext } from './pngtuber/avatar.js';

export const heldAvatar = writable<string | null>(null);
export const dragUser = writable<string | null>(null);
export const heldUser = writable<string | null>(null);
export const avatarCache = new Map<string, Avatar>();
export const contextCache = new Map<string, AvatarContext>();

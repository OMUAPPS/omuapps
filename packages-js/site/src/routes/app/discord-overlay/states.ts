import { Mat4 } from '$lib/math/mat4';
import { Vec2 } from '$lib/math/vec2.js';
import { writable } from 'svelte/store';

type DragState = {
    type: 'user';
    id: string;
    x: number;
    y: number;
};

export const selectedAvatar = writable<string | null>(null);
export const dragState = writable<DragState | null>(null);
export const dragPosition = writable<Vec2 | null>(null);
export const heldUser = writable<string | null>(null);
export const isDraggingFinished = writable<boolean>(false);
export const scaleFactor = writable<number>(1);
export const view = writable<Mat4>(Mat4.IDENTITY);

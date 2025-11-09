import { Mat4 } from '$lib/math/mat4';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { writable } from 'svelte/store';
import type { AlignSide } from './discord-overlay-app';

type DragState = {
    type: 'user';
    id: string;
    time: number;
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
export const alignSide = writable<AlignSide | undefined>();
export const alignClear = writable<boolean>(false);

export const avatarPositions: Record<string, {
    targetPos: Vec2Like;
    pos: Vec2Like;
    rot: number;
    scale: Vec2;
}> = {};

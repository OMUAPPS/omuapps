import type { Matrices } from '$lib/components/canvas/matrices.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import type { Mat4Like } from '$lib/math/mat4.js';
import type { Vec2, Vec2Like } from '$lib/math/vec2.js';
import type { UserAvatarConfig } from '../discord-overlay-app.js';
import type { Effect } from '../effects/effect.js';
import type { GameObject } from './object.js';

export type AvatarAction = {
    id: string;
    talking: boolean;
    mute: boolean;
    deaf: boolean;
    self_mute: boolean;
    self_deaf: boolean;
    suppress: boolean;
    config: UserAvatarConfig;
};

export interface AttachedObject {
    object: GameObject;
    target: string | number;
    matrix: Mat4Like;
    origin: Vec2Like;
    offset: Vec2Like;
}

export interface RenderObject {
    render(): void;
    attached: AttachedObject;
}

export interface RenderOptions {
    effects: Effect[];
    objects: RenderObject[];
};

export interface ContactCandidate {
    attach(object: GameObject, offset: Vec2): AttachedObject;
    render(matrices: Matrices): void;
}

export interface AvatarContext {
    render(action: AvatarAction, options: RenderOptions): void;
    getContactCandidate(point: Vec2): ContactCandidate | undefined;
    bounds(): AABB2;
}

export interface Avatar {
    create(): AvatarContext;
}

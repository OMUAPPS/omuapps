import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import type { Matrices } from '$lib/components/canvas/matrices.js';
import type { AABB2 } from '$lib/math/aabb2.js';
import type { UserAvatarConfig } from '../discord-overlay-app.js';

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

export type Effect = {
    render: (action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) => void;
};

export type RenderOptions = {
    effects: Effect[];
};

export interface AvatarContext {
    render(matrices: Matrices, action: AvatarAction, options: RenderOptions): void;
    bounds(): AABB2;
}

export interface Avatar {
    create(): AvatarContext;
}

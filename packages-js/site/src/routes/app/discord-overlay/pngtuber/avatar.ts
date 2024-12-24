import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import type { MatrixStack } from '$lib/math/matrix-stack.js';

export type AvatarAction = {
    id: string;
    talking: boolean;
    mute: boolean;
    deaf: boolean;
    self_mute: boolean;
    self_deaf: boolean;
    suppress: boolean;
}

export type Effect = {
    render: (action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) => void;
}

export type RenderOptions = {
    effects: Effect[];
}

export interface AvatarContext {
    render(matrices: MatrixStack, action: AvatarAction, options: RenderOptions): void;
}

export interface Avatar {
    create(): AvatarContext;
}

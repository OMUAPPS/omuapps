import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import type { AvatarAction } from '../avatars/avatar';

export type Effect = {
    render: (action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) => void;
};


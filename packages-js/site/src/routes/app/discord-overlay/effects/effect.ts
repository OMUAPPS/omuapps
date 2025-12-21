import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import type { AvatarAction } from '../overlayapp/avatar';

export type Effect = {
    render: (action: AvatarAction, texture: GlTexture, dest: GlFramebuffer) => void;
};


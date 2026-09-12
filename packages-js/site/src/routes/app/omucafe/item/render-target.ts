import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import type { Vec2Like } from '$lib/math/vec2';

/** Scratch targets are borrowed until their last consumer has finished sampling. */
export class RenderTarget {
    readonly texture: GlTexture;
    readonly framebuffer: GlFramebuffer;

    constructor(context: GlContext, size: Vec2Like) {
        this.texture = context.createTexture();
        this.texture.use(() => {
            this.texture.setImage(null, { width: size.x, height: size.y, internalFormat: 'rgba', format: 'rgba' });
            this.texture.setParams({ magFilter: 'linear', minFilter: 'linear', wrapS: 'clamp-to-edge', wrapT: 'clamp-to-edge' });
        });
        this.framebuffer = context.createFramebuffer();
        this.framebuffer.use(() => this.framebuffer.attachTexture(this.texture));
    }

    resize(size: Vec2Like) {
        this.texture.use(() => this.texture.ensureSize(size.x, size.y));
    }

    delete() {
        this.framebuffer.delete();
        this.texture.delete();
    }
}

export class RenderTargetPool {
    private readonly targets: RenderTarget[] = [];
    private readonly busy = new Set<RenderTarget>();

    constructor(private readonly context: GlContext) {}

    dispose(): void {
        for (const target of this.targets) target.delete();
        this.targets.length = 0;
        this.busy.clear();
    }

    async use(size: Vec2Like, callback: (target: RenderTarget) => Promise<void>): Promise<void> {
        const free = this.targets.filter(target => !this.busy.has(target));
        let target = free.find(target => target.texture.width === size.x && target.texture.height === size.y) ?? free[0];
        if (!target) {
            target = new RenderTarget(this.context, size);
            this.targets.push(target);
        } else {
            target.resize(size);
        }
        this.busy.add(target);
        try {
            await callback(target);
        } finally {
            this.busy.delete(target);
        }
    }
}

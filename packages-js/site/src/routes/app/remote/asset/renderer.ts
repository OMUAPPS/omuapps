import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { RenderPipeline } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import type { Omu } from '@omujs/omu';
import type { RemoteAppConfig, Resource, Resources } from '../remote-app';

const IMAGE_CACHE = new Map<string, GlTexture>();
const ASSET_CACHE = new Map<string, AssetRender>();

export class Renderer {
    constructor(
        private readonly pipeline: RenderPipeline,
        private readonly omu: Omu,
        private readonly config: () => RemoteAppConfig,
        private readonly resources: () => Resources,
    ) {}

    public async loadAsset(
        id: string,
        resource: Resource,
    ): Promise<AssetRender> {
        const exist = ASSET_CACHE.get(id);
        if (exist) return exist;
        if (resource.type === 'image') {
            const tex = await this.loadImage(resource.asset);
            const render = new AssetRenderImage(this.pipeline, tex, this.config);
            ASSET_CACHE.set(id, render);
            return render;
        } else if (resource.type === 'album') {
            const textures = await Promise.all(resource.assets.map(this.loadImage));
            const render = new AssetRenderAlbum(this, this.config, this.resources,
                textures.map((tex) => new AssetRenderImage(this.pipeline, tex, this.config)),
            );
            ASSET_CACHE.set(id, render);
            return render;
        } else {
            throw new Error(`Unsupported resource type: ${resource}`);
        }
    }

    public async loadImage(src: string): Promise<GlTexture> {
        const exist = IMAGE_CACHE.get(src);
        if (exist) return exist;
        const img = new Image();
        const res = await fetch(this.omu.assets.url(src)).then((res) => res.blob());
        img.src = URL.createObjectURL(res);
        await img.decode();
        const tex = this.pipeline.context.createTexture();
        tex.use(() => {
            tex.setImage(img, {
                width: img.width,
                height: img.height,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            tex.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        IMAGE_CACHE.set(src, tex);
        return tex;
    }

    public async renderTransition(a: AssetRender, b: AssetRender, t: number) {
        const config = this.config();
        const resources = this.resources();
        const { animation } = config.asset;
        const { gl } = this.pipeline.context;
        const { matrices } = this.pipeline;
        const screen = Vec2.from({ x: gl.canvas.width, y: gl.canvas.height });
        const half = screen.scale(0.5);
        if (animation.type === 'fade') {
            a.render(new Vec4(1, 1, 1, 1 - t));
            b.render(new Vec4(1, 1, 1, t));
        } else if (animation.type === 'flip') {
            matrices.model.translate(half.x, half.y, 0);
            matrices.model.scale(Math.abs(Math.cos(t * Math.PI)), 1, 1);
            matrices.model.translate(-half.x, -half.y, 0);
            if (t < 0.5) {
                a.render();
            } else {
                b.render();
            }
        } else if (animation.type === 'slide') {
            const direction = {
                left: new Vec2(-1, 0),
                right: new Vec2(1, 0),
                up: new Vec2(0, -1),
                down: new Vec2(0, 1),
            }[animation.direction];
            const lastOffset = screen.mul(direction).scale(t);
            matrices.model.identity();
            matrices.model.translate(lastOffset.x, lastOffset.y, 0);
            a.render();
            const offset = screen.mul(direction).scale(t - 1);
            matrices.model.identity();
            matrices.model.translate(offset.x, offset.y, 0);
            b.render();
        }
    }

    public async render() {
        const { gl } = this.pipeline.context;
        const { matrices } = this.pipeline;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
        );
        const config = this.config();
        const resources = this.resources();
        const id = config.show?.id;
        if (!id) {
            prev = null;
            last = null;
            return;
        }
        const resource = resources.resources[id];
        const { animation, easing } = config.asset;
        matrices.model.identity();
        const asset = await this.loadAsset(id, resource);
        if (!prev || prev.texture !== asset) {
            if (prev) {
                last = {
                    texture: prev.texture,
                    time: performance.now(),
                };
            }
            prev = {
                texture: asset,
                time: performance.now(),
            };
        }
        if (last === null || animation.type === 'none') {
            asset.render();
        } else {
            const duration = animation.duration * 1000;
            const { texture: lastTexture, time } = last;
            const elapsed = performance.now() - time;
            if (elapsed > duration) {
                last = null;
                asset.render();
            } else {
                const t = ease(elapsed / duration, easing.type);
                this.renderTransition(lastTexture, asset, t);
            }
        }
    }
}

interface AssetRender {
    render(color?: Vec4): void;
}

class AssetRenderImage implements AssetRender {
    constructor(
        private readonly pipeline: RenderPipeline,
        public texture: GlTexture,
        private readonly config: () => RemoteAppConfig,
    ) {
        this.texture = texture;
    }

    public render(color: Vec4 = Vec4.ONE) {
        const { draw } = this.pipeline;
        const bounds = this.calculateBounds();
        draw.texture(
            bounds.min.x,
            bounds.min.y,
            bounds.max.x,
            bounds.max.y,
            this.texture,
            color,
        );
    }

    public calculateBounds() {
        const { align, scaling } = this.config().asset;
        const texture = this.texture;
        const canvas = this.pipeline.context.gl.canvas;
        const screen = Vec2.from({ x: canvas.width, y: canvas.height });
        let bounds = AABB2.from({
            min: { x: 0, y: 0 },
            max: { x: texture.width, y: texture.height },
        });
        switch (scaling.type) {
            case 'contain': {
                const scale = Math.min(
                    canvas.width / texture.width,
                    canvas.height / texture.height,
                );
                bounds = bounds.multiply({ x: scale, y: scale });
                break;
            }
            case 'cover': {
                const scale = Math.max(
                    canvas.width / texture.width,
                    canvas.height / texture.height,
                );
                bounds = bounds.multiply({ x: scale, y: scale });
                break;
            }
            case 'stretch': {
                const scale = Vec2.from({
                    x:
                            scaling.width.type === 'percent'
                                ? (canvas.width * scaling.width.value) / 100
                                : scaling.width.value,
                    y:
                            scaling.height.type === 'percent'
                                ? (canvas.height * scaling.height.value) / 100
                                : scaling.height.value,
                });
                bounds = bounds.multiply(
                    scale.div({ x: texture.width, y: texture.height }),
                );
                break;
            }
        }
        const side = {
            x: {
                start: 0,
                middle: 0.5,
                end: 1,
            }[align.x],
            y: {
                start: 0,
                middle: 0.5,
                end: 1,
            }[align.y],
        };
        const point = screen.mul(side);
        return bounds.setAt(side, point);
    }
}

class AssetRenderAlbum implements AssetRender {
    constructor(
        private readonly renderer: Renderer,
        private readonly config: () => RemoteAppConfig,
        private readonly resources: () => Resources,
        public assets: AssetRender[],
    ) {}

    public render(color: Vec4 = Vec4.ONE) {
        const config = this.config();
        const { animation, easing } = config.asset;
        const resource =
            config.show && this.resources().resources[config.show.id];
        const duration =
            (resource?.type === 'album' && resource.duration) || 10;
        const time = performance.now() / 1000;
        const index = Math.floor(time / duration) % this.assets.length;
        if (animation.type === 'none') {
            this.assets[index].render(color);
        } else {
            const transition = animation.duration;
            const t = Math.min(1, (time % duration) / transition);
            const assetA = this.assets[index];
            const assetB = this.assets[(index + 1) % this.assets.length];
            this.renderer.renderTransition(assetA, assetB, ease(t, easing.type));
        }
    }
}

let last: {
    texture: AssetRender;
    time: number;
} | null = null;
let prev: {
    texture: AssetRender;
    time: number;
} | null = null;

function ease(t: number, type: RemoteAppConfig['asset']['easing']['type']) {
    switch (type) {
        case 'linear':
            return t;
        case 'ease':
            return 0.5 - 0.5 * Math.cos(t * Math.PI);
        case 'bounce': {
            if (t < 1 / 2.75) {
                return 7.5625 * t * t;
            } else if (t < 2 / 2.75) {
                return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            } else if (t < 2.5 / 2.75) {
                return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            }
        }
        case 'elastic': {
            const p = 0.3;
            return (
                Math.pow(2, -10 * t) *
                    Math.sin(((t - p / 4) * (2 * Math.PI)) / p) +
                    1
            );
        }
    }
}

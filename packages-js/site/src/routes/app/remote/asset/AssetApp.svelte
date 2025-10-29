<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type {
        GlContext,
        GlTexture,
    } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { RemoteApp, type Resource } from '../remote-app.js';

    export let omu: Omu;
    const remote = new RemoteApp(omu, 'asset');

    if (BROWSER) {
        omu.start();
    }

    const { config, resources } = remote;

    const matrices = new Matrices();
    let draw: Draw;
    let glcontext: GlContext;

    async function init(ctx: GlContext) {
        glcontext = ctx;
        draw = new Draw(matrices, ctx);
    }

    async function resize(ctx: GlContext) {
        const canvas = ctx.gl.canvas;
        matrices.projection.orthographic(
            0,
            canvas.width,
            canvas.height,
            0,
            -1,
            1,
        );
    }

    const IMAGE_CACHE = new Map<string, GlTexture>();

    async function loadImage(src: string): Promise<GlTexture> {
        const exist = IMAGE_CACHE.get(src);
        if (exist) return exist;
        const img = new Image();
        const res = await fetch(omu.assets.url(src)).then((res) => res.blob());
        img.src = URL.createObjectURL(res);
        await img.decode();
        const tex = glcontext.createTexture();
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

    const ASSET_CACHE = new Map<string, AssetRender>();

    interface AssetRender {
        render(color?: Vec4): void;
    }

    class AssetRenderImage implements AssetRender {
        constructor(public texture: GlTexture) {}

        public render(color: Vec4 = Vec4.ONE) {
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
            const { align, scaling } = $config.asset;
            const texture = this.texture;
            const canvas = glcontext.gl.canvas;
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
        constructor(public assets: AssetRender[]) {}

        public render(color: Vec4 = Vec4.ONE) {
            const { animation, easing } = $config.asset;
            const resource =
                $config.show && $resources.resources[$config.show.id];
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
                renderTransition(assetA, assetB, ease(t, easing.type));
            }
        }
    }

    async function loadAsset(
        id: string,
        resource: Resource,
    ): Promise<AssetRender> {
        const exist = ASSET_CACHE.get(id);
        if (exist) return exist;
        if (resource.type === 'image') {
            const tex = await loadImage(resource.asset);
            const render = new AssetRenderImage(tex);
            ASSET_CACHE.set(id, render);
            return render;
        } else if (resource.type === 'album') {
            const textures = await Promise.all(resource.assets.map(loadImage));
            const render = new AssetRenderAlbum(
                textures.map((tex) => new AssetRenderImage(tex)),
            );
            ASSET_CACHE.set(id, render);
            return render;
        } else {
            throw new Error(`Unsupported resource type: ${resource}`);
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

    function ease(t: number, type: typeof $config.asset.easing.type) {
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

    async function renderTransition(a: AssetRender, b: AssetRender, t: number) {
        const { animation } = $config.asset;
        const { gl } = glcontext;
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

    async function render(ctx: GlContext) {
        const { gl } = ctx;
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
        const id = $config.show?.id;
        if (!id) {
            prev = null;
            last = null;
            return;
        }
        const resource = $resources.resources[id];
        const { animation, easing } = $config.asset;
        matrices.model.identity();
        const asset = await loadAsset(id, resource);
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
                renderTransition(lastTexture, asset, t);
            }
        }
    }
</script>

<main>
    <Canvas {init} {resize} {render} />
</main>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }
</style>

<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type { GlContext, GlTexture } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import type { Omu } from '@omujs/omu';
    import type { RemoteApp } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;
    const { config } = remote;


    const matrices = new Matrices();
    let draw: Draw;
    let glcontext: GlContext;

    async function init(ctx: GlContext) {
        glcontext = ctx;
        draw = new Draw(matrices, ctx);
    }

    async function resize(ctx: GlContext) {
        const canvas = ctx.gl.canvas;
        matrices.projection.orthographic(0, canvas.width, canvas.height, 0, -1, 1);
    }

    
    class Texture {
        private static CACHE = new Map<string, Texture>();
        constructor(public tex: GlTexture, public width: number, public height: number) {}

        public static async load(src: string) {
            const exist = Texture.CACHE.get(src);
            if (exist) return exist;
            const img = new Image();
            const res = await fetch(omu.assets.url(src)).then(res => res.blob());
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
                })
            })
            const texture = new Texture(tex, img.width, img.height);
            Texture.CACHE.set(src, texture);
            return texture;
        }

        public calculateBounds(): AABB2 {
            const { align, scaling } = $config.asset;
            const canvas = glcontext.gl.canvas;
            const screen = Vec2.from({ x: canvas.width, y: canvas.height });
            let bounds = AABB2.from({
                min: { x: 0, y: 0 },
                max: { x: this.width, y: this.height },
            });
            switch (scaling.type) {
                case 'contain': {
                    const scale = Math.min(canvas.width / this.width, canvas.height / this.height);
                    bounds = bounds.multiply({ x: scale, y: scale });
                    break;
                }
                case 'cover': {
                    const scale = Math.max(canvas.width / this.width, canvas.height / this.height);
                    bounds = bounds.multiply({ x: scale, y: scale });
                    break;
                }
                case 'stretch': {
                    const scale = Vec2.from({
                        x: (scaling.width.type === 'percent') ? canvas.width * scaling.width.value / 100 : scaling.width.value,
                        y: (scaling.height.type === 'percent') ? canvas.height * scaling.height.value / 100 : scaling.height.value,
                    });
                    bounds = bounds.multiply(scale.div({ x: this.width, y: this.height }));
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
            }
            const point = screen.mul(side);
            return bounds.setAt(side, point);
        }
    }

    let last: {
        texture: Texture,
        time: number,
    } | null = null;
    let prev: {
        texture: Texture,
        time: number,
    } | null = null;

    function ease(t: number, type: typeof $config.asset.easing.type) {
        switch (type) {
            case 'linear': return t;
            case 'ease': return 0.5 - 0.5 * Math.cos(t * Math.PI);
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
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            }
        }
    }

    async function render(ctx: GlContext) {
        const { gl } = ctx;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (!$config.show) return;
        const { asset } = $config.show;
        const { animation, easing } = $config.asset;
        matrices.model.identity();
        const screen = Vec2.from({ x: gl.canvas.width, y: gl.canvas.height });
        const half = screen.scale(0.5);
        const texture = await Texture.load(asset);
        const bounds = texture.calculateBounds();
        if (!prev || prev.texture !== texture) {
            if (prev) {
                last = {
                    texture: prev.texture,
                    time: performance.now(),
                }
            }
            prev = {
                texture,
                time: performance.now(),
            }
        }
        if (last === null || animation.type === 'none') {
            draw.texture(
                bounds.min.x, bounds.min.y,
                bounds.max.x, bounds.max.y,
                texture.tex,
            )
        } else {
            const duration = animation.duration * 1000;
            const { texture: lastTexture, time } = last;
            const elapsed = performance.now() - time;
            const lastBounds = texture.calculateBounds();
            if (elapsed > duration) {
                last = null;
            }
            const t = Math.min(1.0, Math.max(0.0, ease(elapsed / duration, easing.type)));
            if (animation.type === 'fade') {
                draw.texture(
                    lastBounds.min.x, lastBounds.min.y,
                    lastBounds.max.x, lastBounds.max.y,
                    lastTexture.tex,
                    new Vec4(1, 1, 1, 1 - t),
                )
                draw.texture(
                    bounds.min.x, bounds.min.y,
                    bounds.max.x, bounds.max.y,
                    texture.tex,
                    new Vec4(1, 1, 1, t),
                )
            }
            else if (animation.type === 'flip') {
                matrices.model.translate(half.x, half.y, 0);
                matrices.model.scale(Math.abs(Math.cos(t * Math.PI)), 1, 1);
                matrices.model.translate(-half.x, -half.y, 0);
                if (t < 0.5) {
                    draw.texture(
                        lastBounds.min.x, lastBounds.min.y,
                        lastBounds.max.x, lastBounds.max.y,
                        lastTexture.tex,
                    )
                } else {
                    draw.texture(
                        bounds.min.x, bounds.min.y,
                        bounds.max.x, bounds.max.y,
                        texture.tex,
                    )
                }
            }
            else if (animation.type === 'slide') {
                const direction = {
                    left: new Vec2(-1, 0),
                    right: new Vec2(1, 0),
                    up: new Vec2(0, -1),
                    down: new Vec2(0, 1),
                }[animation.direction];
                const lastOffset = screen.mul(direction).scale(t);
                draw.texture(
                    lastBounds.min.x + lastOffset.x, lastBounds.min.y + lastOffset.y,
                    lastBounds.max.x + lastOffset.x, lastBounds.max.y + lastOffset.y,
                    lastTexture.tex,
                )
                const offset = screen.mul(direction).scale((t - 1));
                draw.texture(
                    bounds.min.x + offset.x, bounds.min.y + offset.y,
                    bounds.max.x + offset.x, bounds.max.y + offset.y,
                    texture.tex,
                )
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

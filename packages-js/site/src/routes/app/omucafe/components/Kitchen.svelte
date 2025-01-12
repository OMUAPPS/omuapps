<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type { GlContext, GlTexture } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { AABB2 } from '$lib/math/aabb2.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { Identifier } from '@omujs/omu';
    import cursor_grab from '../images/cursor_grab.png';
    import cursor_point from '../images/cursor_point.png';
    import { game, type Asset, type KitchenItem } from '../omucafe-app.js';

    const { states, config, omu } = game;

    const COUNTER_WIDTH = 1920;
    const COUNTER_HEIGHT = 500;
    let glContext: GlContext;
    let matrices: Matrices;
    let textures: Map<string, GlTexture> = new Map();
    let canvas: HTMLCanvasElement;
    let clientMouse: Vec2 = Vec2.ZERO;
    let canvasMouse: Vec2 = Vec2.ZERO;
    let mouse: Vec2 = Vec2.ZERO;
    let deltaMouse: Vec2 = Vec2.ZERO;
    let mouseDown: boolean = false;
    let draw: Draw;

    async function getTexture(key: string, image: HTMLImageElement): Promise<GlTexture> {
        const existing = textures.get(key);
        if (existing) {
            return existing;
        }
        const texture = glContext.createTexture();
        texture.use(() => {
            texture.setImage(image, {
                width: image.width,
                height: image.height,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            texture.setParams({
                minFilter: 'nearest',
                magFilter: 'nearest',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        textures.set(key, texture);
        return texture;
    }

    async function getTextureByUri(uri: string): Promise<GlTexture> {
        const existing = textures.get(uri);
        if (existing) {
            return existing;
        }
        const image = new Image();
        image.src = uri;
        await image.decode();
        return getTexture(uri, image);
    }

    async function getTextureByAsset(asset: Asset): Promise<GlTexture> {
        if (asset.type === 'url') {
            const existing = textures.get(asset.url);
            if (existing) {
                return existing;
            }
            const image = new Image();
            image.src = asset.url;
            await image.decode();
            return getTexture(asset.url, image);
        }
        if (asset.type === 'asset') {
            const existing = textures.get(asset.id);
            if (existing) {
                return existing;
            }
            const result = await omu.assets.download(Identifier.fromKey(asset.id));
            const image = new Image();
            image.src = URL.createObjectURL(new Blob([result.buffer]));
            await image.decode();
            URL.revokeObjectURL(image.src);
            return getTexture(asset.id, image);
        }
        throw new Error(`Invalid asset type: ${asset}`);
    }

    async function init(context: GlContext) {
        matrices = new Matrices();
        draw = new Draw(matrices, context);
    }

    async function renderItem(item: KitchenItem) {
        if (!item.ingredient.image) {
            return;
        }
        const isHeld = $states.kitchen.held === item.id;
        const isHover = $states.kitchen.hovering === item.id;
        const texture = await getTextureByAsset(item.ingredient.image);
        let { width, height } = texture;
        const sclae = 100 / width;
        width *= sclae;
        height *= sclae;
        if (isHeld) {
            draw.texture(
                item.transform.x,
                item.transform.y,
                item.transform.x + width,
                item.transform.y + height,
                texture,
            );
            draw.textureColor(
                item.transform.x,
                item.transform.y + 8,
                item.transform.x + width,
                item.transform.y + height + 8,
                texture,
                new Vec4(0.2, 0.3, 0.4, 1),
            );
        }
        else if (isHover) {
            draw.textureColor(
                item.transform.x,
                item.transform.y + 8,
                item.transform.x + width,
                item.transform.y + height + 8,
                texture,
                new Vec4(0.2, 0.3, 0.4, 0.2),
            );
        }
        draw.texture(
            item.transform.x,
            item.transform.y,
            item.transform.x + width,
            item.transform.y + height,
            texture,
        );
        if (isHeld) {
            draw.textureColor(
                item.transform.x,
                item.transform.y,
                item.transform.x + width,
                item.transform.y + height,
                texture,
                new Vec4(1, 1, 1, 0.1),
            );
            draw.textureOutline(
                item.transform.x,
                item.transform.y,
                item.transform.x + width,
                item.transform.y + height,
                texture,
                new Vec4(0.2, 0.3, 0.4, 1),
                2
            );
        }
        else if (isHover) {
            draw.textureOutline(
                item.transform.x,
                item.transform.y,
                item.transform.x + width,
                item.transform.y + height,
                texture,
                new Vec4(0.2, 0.3, 0.4, 0.8),
                2
            );
        }
    }

    let scaleFactor = 1;

    async function renderCursor() {
        const CURSORS = {
            grab: {
                image: await getTextureByUri(cursor_grab),
                width: 48,
                height: 48,
                x: 0,
                y: 0,
            },
            point: {
                image: await getTextureByUri(cursor_point),
                width: 48,
                height: 48,
                x: 12,
                y: 12,
            },
        }
        const cursor = $states.kitchen.held ? CURSORS.point : CURSORS.grab;

        draw.textureOutline(
            mouse.x - cursor.width / 2 / scaleFactor + cursor.x,
            mouse.y - cursor.height / 2 / scaleFactor + cursor.y,
            mouse.x + cursor.width / 2 / scaleFactor + cursor.x,
            mouse.y + cursor.height / 2 / scaleFactor + cursor.y,
            cursor.image,
            Vec4.ONE,
            2,
        );
        draw.texture(
            mouse.x - cursor.width / 2 / scaleFactor + cursor.x,
            mouse.y - cursor.height / 2 / scaleFactor + cursor.y,
            mouse.x + cursor.width / 2 / scaleFactor + cursor.x,
            mouse.y + cursor.height / 2 / scaleFactor + cursor.y,
            cursor.image,
        );
    }

    async function render(context: GlContext) {
        const { gl } = context;
        const rect = canvas.getBoundingClientRect();
        scaleFactor = rect.width / COUNTER_WIDTH;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(0.9, 0.85, 0.8, 1));
        matrices.view.identity();
        matrices.view.translate(0, gl.canvas.height - COUNTER_HEIGHT, 0);
        matrices.view.scale(scaleFactor, scaleFactor, 1);
        draw.rectangle(0, 0, gl.canvas.width / scaleFactor, COUNTER_HEIGHT, new Vec4(1, 1, 1, 1));

        const lastMouse = canvasMouse;
        canvasMouse = clientMouse
            .sub(new Vec2(rect.left, rect.top))
            .sub(new Vec2(matrices.view.get().m30, matrices.view.get().m31))
        deltaMouse = canvasMouse.sub(lastMouse).scale(1 / scaleFactor);
        mouse = canvasMouse.scale(1 / scaleFactor);

        if (!mouseDown && $states.kitchen.held) {
            $states.kitchen.held = null;
        }
        for (const [id, item] of Object.entries($states.kitchen.items)) {
            if (item.type === 'ingredient') {
                const image = item.ingredient.image;
                if (!image) {
                    continue;
                }
                const bounds = new AABB2(
                    new Vec2(item.transform.x, item.transform.y),
                    new Vec2(item.transform.x + 100, item.transform.y + 100),
                );
                const isHover = $states.kitchen.held ? $states.kitchen.held === id : bounds.contains(mouse);
                const isHeld = $states.kitchen.held === id;
                if (isHover) {
                    if (mouseDown && !isHeld) {
                        $states.kitchen.held = id;
                    }
                    if ($states.kitchen.hovering !== id) {
                        $states.kitchen.hovering = id;
                    }
                }
                if (isHeld) {
                    item.transform.x += deltaMouse.x;
                    item.transform.y += deltaMouse.y;
                }
                await renderItem(item);
            }
        }
        await renderCursor();
    }
</script>

<svelte:window
    on:mousemove={(e) => {
        clientMouse = new Vec2(e.clientX, e.clientY);
    }}
    on:mousedown={() => {
        mouseDown = true;
    }}
    on:mouseup={() => {
        mouseDown = false;
    }}
/>
<div class="kitchen">
    <Canvas bind:canvas bind:glContext {init} {render} />
    <div class="ui">
        {#each Object.entries($config.ingredients) as [id, ingredient] (id)}
            <button on:click={() => {
                const itemId = Date.now().toString();
                $states.kitchen.items = {
                    ...$states.kitchen.items,
                    [itemId]: {
                        type: 'ingredient',
                        id: itemId,
                        ingredient,
                        behaviors: {},
                        transform: {
                            x: 0,
                            y: 0,
                            rotation: 0,
                            scale: {
                                x: 1,
                                y: 1,
                            },
                        },
                    }
                };
            }}>
                {ingredient.name}
            </button>
        {/each}
        <button on:click={() => {
            $states.kitchen.items = {};
        }}>
            全部消す
        </button>
    </div>
</div>

<style lang="scss">
    .kitchen {
        position: absolute;
        inset: 0;
        cursor: none;
    }

    .ui {
        position: absolute;
        bottom: 0;
        right: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.5);
    }
</style>

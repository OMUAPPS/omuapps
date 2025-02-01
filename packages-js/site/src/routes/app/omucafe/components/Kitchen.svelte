<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type { GlContext, GlTexture } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { Identifier } from '@omujs/omu';
    import cursor_grab from '../images/cursor_grab.png';
    import cursor_point from '../images/cursor_point.png';
    import { createKitchenItem, game, type Asset, type KitchenItem, type Transform } from '../omucafe-app.js';

    const { scene, states, config, omu } = game;

    const COUNTER_WIDTH = 1920;
    const COUNTER_HEIGHT = 500;
    let glContext: GlContext;
    let matrices: Matrices;
    let textures: Map<string, GlTexture> = new Map();
    let canvas: HTMLCanvasElement;
    let isMouseOver: boolean = false;
    let clientMouse: Vec2 = Vec2.ZERO;
    let glMouse: Vec2 = Vec2.ZERO;
    let deltaGlMouse: Vec2 = Vec2.ZERO;
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

    function transformToMatrix(transform: Transform): Mat4 {
        const { right, up, offset } = transform;
        return new Mat4(
            right.x, right.y, 0, 0,
            up.x, up.y, 0, 0,
            0, 0, 1, 0,
            offset.x, offset.y, 0, 1,
        );
    }

    function canItemBeHeld(item: KitchenItem): boolean {
        const { behaviors } = item;
        if (behaviors.fixed) {
            return false;
        }
        return true;
    }

    function isItemHovering(item: KitchenItem): boolean {
        const { bounds } = item;
        const { min, max } = bounds;
        const matrix = transformToMatrix(item.transform);
        const inverse = matrix.inverse();
        const screenMouse = matrices.unprojectPoint(glMouse);
        const mouse = inverse.xform2(screenMouse);
        return (
            mouse.x >= min.x &&
            mouse.y >= min.y &&
            mouse.x <= max.x &&
            mouse.y <= max.y
        );
    }

    function applyDragEffect() {
        const deltaMouse = matrices.unprojectPoint(glMouse).sub(matrices.unprojectPoint(glMouse.sub(deltaGlMouse)));
        matrices.model.multiply(new Mat4(
            1, -deltaMouse.y / 1000, 0, 0,
            -deltaMouse.x / 1000, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ));
    }

    async function renderItem(item: KitchenItem) {
        const { ingredient } = item;
        const { behaviors } = item;
        if (!ingredient.image) {
            return;
        }
        const texture = await getTextureByAsset(ingredient.image);
        let { width, height } = texture;
        const transform = transformToMatrix(item.transform);
        matrices.model.push();
        matrices.model.multiply(transform);
        if ($states.kitchen.held === item.id) {
            applyDragEffect();
        }
        if ($states.kitchen.hovering === item.id) {
            draw.textureOutline(
                0, 0,
                width, height,
                texture,
                new Vec4(1, 0, 0, 1),
                10,
            );
        }
        draw.texture(
            0, 0,
            width, height,
            texture,
        );
        if (behaviors.container) {
            const container = behaviors.container;
            for (const [id, item] of Object.entries(container.items)) {
                await renderItem(item);
            }
            if (container.overlay) {
                const transform = transformToMatrix(container.overlayTransform);
                matrices.model.push();
                matrices.model.multiply(transform);
                const containerTexture = await getTextureByAsset(container.overlay);
                let { width, height } = containerTexture;
                draw.texture(
                    0, 0,
                    width, height,
                    containerTexture,
                );
                matrices.model.pop();
            }
        }
        matrices.model.pop();
    }

    let scaleFactor = 1;

    async function renderCursor() {
        if (!isMouseOver) {
            return;
        }
        const mouse = matrices.unprojectPoint(glMouse);
        const deltaMouse = matrices.unprojectPoint(glMouse).sub(matrices.unprojectPoint(glMouse.sub(deltaGlMouse)));
        matrices.model.push();
        matrices.model.multiply(new Mat4(
            1, -deltaMouse.y / 100, 0, 0,
            -deltaMouse.x / 100, 1, 0, 0,
            0, 0, 1, 0,
            mouse.x + deltaMouse.x * 0.5, mouse.y + deltaMouse.y * 0.5, 0, 1,
        ));
        const CURSORS = {
            grab: {
                image: await getTextureByUri(cursor_grab),
                width: 48,
                height: 48,
                x: -16,
                y: -16,
            },
            point: {
                image: await getTextureByUri(cursor_point),
                width: 48,
                height: 48,
                x: -4,
                y: -4,
            },
        }
        const cursor = $states.kitchen.held ? CURSORS.point : CURSORS.grab;

        draw.textureOutline(
            cursor.x,
            cursor.y,
            cursor.width + cursor.x,
            cursor.height + cursor.y,
            cursor.image,
            Vec4.ONE,
            2,
        );
        draw.texture(
            cursor.x,
            cursor.y,
            cursor.width + cursor.x,
            cursor.height + cursor.y,
            cursor.image,
        );
        matrices.model.pop();
    }

    function setupCounterProjection() {
        const { gl } = glContext;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(0.9, 0.85, 0.8, 1));
        matrices.view.identity();
        matrices.view.translate(0, gl.canvas.height - COUNTER_HEIGHT, 0);
        matrices.view.scale(scaleFactor, scaleFactor, 1);
    }

    function setupHUDProjection() {
        const { gl } = glContext;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrices.view.identity();
    }

    async function renderHoveringItem() {
        const { hovering } = $states.kitchen;
        if (!hovering) return;
        const item = $states.kitchen.items[hovering];
        if (!item) return;
        await renderItem(item);
    }

    async function renderHeldItem() {
        const { held } = $states.kitchen;
        if (!held) return;
        const item = $states.kitchen.items[held];
        if (!item) return;
        const deltaMouse = matrices.unprojectPoint(glMouse).sub(matrices.unprojectPoint(glMouse.sub(deltaGlMouse)));
        item.transform.offset = {
            x: item.transform.offset.x + deltaMouse.x,
            y: item.transform.offset.y + deltaMouse.y,
        }
        await renderItem(item);
    }

    function processDrop(heldItem: KitchenItem, hoveringItem: KitchenItem) {
        const { ingredient: heldIng} = heldItem;
        const { ingredient: hoveringIng} = hoveringItem;
        const { behaviors: heldBehaves } = heldItem;
        const { behaviors: hoverBehaves } = hoveringItem;
        if (hoverBehaves.container) {
            const container = hoverBehaves.container;
            container.items = {
                ...container.items,
                [heldItem.id]: heldItem,
            };
            const containerTransform = transformToMatrix(hoveringItem.transform);
            const heldTransform = transformToMatrix(heldItem.transform);
            const inverse = containerTransform.inverse();
            const newMatrix = inverse.multiply(heldTransform);
            heldItem.transform = {
                right: new Vec2(newMatrix.m00, newMatrix.m01),
                up: new Vec2(newMatrix.m10, newMatrix.m11),
                offset: new Vec2(newMatrix.m30, newMatrix.m31),
            };
            delete $states.kitchen.items[heldItem.id];
        }
    }

    function updateMouse() {
        if ($scene.type === 'cooking') {
            if (!mouseDown && $states.kitchen.held) {
                const { hovering, held } = $states.kitchen;
                if (hovering && held) {
                    processDrop($states.kitchen.items[held], $states.kitchen.items[hovering]);
                }
                $states.kitchen.held = null;
            }
            for (const [id, item] of Object.entries($states.kitchen.items).reverse()) {
                if (id === $states.kitchen.held) continue;
                if (!canItemBeHeld(item) || item.type !== 'ingredient') continue;
                const hovered = isItemHovering(item);
                if (hovered) {
                    if ($states.kitchen.hovering !== id) {
                        $states.kitchen.hovering = id;
                    }
                    if (mouseDown && !$states.kitchen.held) {
                        $states.kitchen.held = id;
                        $states.kitchen.hovering = null;
                    }
                    break;
                } else if ($states.kitchen.hovering === id) {
                    $states.kitchen.hovering = null;
                }
            }
        } else if ($states.kitchen.held || $states.kitchen.hovering) {
            $states.kitchen.held = null;
            $states.kitchen.hovering = null;
        }
    }

    async function renderItems() {
        for (const [id, item] of Object.entries($states.kitchen.items)) {
            if (id === $states.kitchen.held) continue;
            if (id === $states.kitchen.hovering) continue;
            if (item.type === 'ingredient') {
                await renderItem(item);
            }
        }
    }

    async function render(context: GlContext) {
        const { gl } = context;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        const rect = canvas.getBoundingClientRect();
        scaleFactor = rect.width / COUNTER_WIDTH;
        setupCounterProjection();
        const lastGlMouse = glMouse;
        glMouse = clientMouse
            .sub(new Vec2(rect.left, rect.top))
            .remap(
                new Vec2(0, 0),
                new Vec2(gl.canvas.width, gl.canvas.height),
                new Vec2(-1, 1),
                new Vec2(1, -1),
            );
        deltaGlMouse = glMouse.sub(lastGlMouse);
        
        draw.rectangle(0, 0, gl.canvas.width / scaleFactor, COUNTER_HEIGHT, new Vec4(1, 1, 1, 1));
        updateMouse();
        await renderItems();
        await renderHoveringItem();
        await renderHeldItem();
        setupHUDProjection();
        const { width, height } = gl.canvas;
        if ($scene.type === 'ingredient_edit') {
            draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(1, 1, 1, 0.5));
            matrices.view.push();
            matrices.view.translate(width / 2, height / 2, 0);
            const ingredient = $config.ingredients[$scene.id];
            const transform = transformToMatrix(ingredient.transform);
            const { min, max } = ingredient.bounds;
            const offset = new Vec2(
                (min.x + max.x) / 2,
                (min.y + max.y) / 2,
            ).mul(new Vec2(
                transform.m00,
                transform.m11,
            ));
            matrices.view.translate(-offset.x, -offset.y, 0);
            await renderItem(createKitchenItem(
                'preview',
                ingredient,
            ));
            matrices.view.pop();
        }
        await renderCursor();
    }
</script>

<svelte:window
    on:mousemove={(e) => {
        clientMouse = new Vec2(e.clientX, e.clientY);
        isMouseOver = true;
    }}
    on:mousedown={() => {
        mouseDown = true;
    }}
    on:mouseup={() => {
        mouseDown = false;
    }}
    on:mouseout={() => {
        isMouseOver = false;
    }}
    on:mouseenter={() => {
        isMouseOver = true;
    }}    
    on:mouseleave={() => {
        isMouseOver = false;
    }}
/>
<div class="kitchen">
    <div class="canvas">
        <Canvas bind:canvas bind:glContext {init} {render} />
    </div>
    <div class="ui">
        {#each Object.entries($config.ingredients) as [id, ingredient] (id)}
            <button on:click={() => {
                const itemId = Date.now().toString();
                $states.kitchen.items = {
                    ...$states.kitchen.items,
                    [itemId]: createKitchenItem(
                        itemId,
                        ingredient,
                    ),
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
        overflow: hidden;
    }

    .canvas {
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
        z-index: 1;
    }
</style>

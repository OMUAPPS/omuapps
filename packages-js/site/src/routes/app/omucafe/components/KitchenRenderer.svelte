<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type { GlContext, GlTexture } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { getAssetImage, type Asset } from '../game/asset.js';
    import { attachChildren, callBehaviorHandler, createKitchenItem, getItemTransform, type KitchenItem } from '../game/kitchen-item.js';
    import type { KitchenContext } from '../game/kitchen.js';
    import { transformToMatrix } from '../game/transform.js';
    import cursor_grab from '../images/cursor_grab.png';
    import cursor_point from '../images/cursor_point.png';
    import { getGame } from '../omucafe-app.js';

    const { scene, states, config, omu } = getGame();

    export let side: 'client' | 'asset' = 'client';
    const COUNTER_WIDTH = 1920;
    const COUNTER_HEIGHT = 500;
    const UPDATE_RATE = 60;
    let context: KitchenContext = {
        ...$states.kitchen,
        side,
    }
    let lastUpdate = performance.now();
    let changed = false;
    let glContext: GlContext;
    let matrices: Matrices;
    let textures: Map<string, Texture> = new Map();
    let canvas: HTMLCanvasElement;
    let isMouseOver: boolean = false;
    let clientMouse: Vec2 = Vec2.ZERO;
    let glMouse: Vec2 = Vec2.ZERO;
    let deltaGlMouse: Vec2 = Vec2.ZERO;
    let mouseDown: boolean = false;
    let mouseDownTime: number = 0;
    let mouseUpTime: number = 0;
    let draw: Draw;

    type Texture = {
        tex: GlTexture,
        width: number,
        height: number,
        image: HTMLImageElement,
        data: Uint8Array,
    }

    async function getTexture(key: string, image: HTMLImageElement): Promise<Texture> {
        const existing = textures.get(key);
        if (existing) {
            return existing;
        }
        const tex = glContext.createTexture();
        tex.use(() => {
            tex.setImage(image, {
                width: image.width,
                height: image.height,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            tex.setParams({
                minFilter: 'nearest',
                magFilter: 'nearest',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2d context');
        }
        context.drawImage(image, 0, 0);
        const data = new Uint8Array(image.width * image.height * 4);
        context.getImageData(0, 0, image.width, image.height).data.forEach((value, index) => {
            data[index] = value;
        });

        const texture = {
            tex: tex,
            width: image.width,
            height: image.height,
            image,
            data,
        };
        textures.set(key, texture);
        return texture;
    }

    async function getTextureByUri(uri: string): Promise<Texture> {
        const existing = textures.get(uri);
        if (existing) {
            return existing;
        }
        const image = new Image();
        image.src = uri;
        await image.decode();
        return getTexture(uri, image);
    }

    async function getTextureByAsset(asset: Asset): Promise<Texture> {
        const key = asset.type === 'url' ? asset.url : asset.id;
        const existing = textures.get(key);
        if (existing) {
            return existing;
        }
        const image = await getAssetImage(asset);
        return getTexture(key, image);
    }

    async function init(context: GlContext) {
        matrices = new Matrices();
        draw = new Draw(matrices, context);
    }

    async function isItemHovering(item: KitchenItem): Promise<boolean> {
        if (!item.ingredient.image) return false;
        const { bounds } = item;
        const { min, max } = bounds;
        const matrix = getItemTransform(context, item);
        const inverse = matrix.inverse();
        const screenMouse = matrices.unprojectPoint(glMouse);
        const mouse = inverse.xform2(screenMouse);
        
        const aabbTest = (
            mouse.x >= min.x &&
            mouse.y >= min.y &&
            mouse.x <= max.x &&
            mouse.y <= max.y
        );
        if (!aabbTest) return false;

        const texture = await getTextureByAsset(item.ingredient.image);
        const uv = mouse.remap(
            new Vec2(min.x, min.y),
            new Vec2(max.x, max.y),
            Vec2.ZERO,
            Vec2.ONE,
        );
        const { width, height } = texture;
        const x = Math.floor(uv.x * width);
        const y = Math.floor(uv.y * height);
        const index = (x + y * width) * 4;
        const alpha = texture.data[index + 3];
        return alpha > 0;
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

    async function renderItem(item: KitchenItem, options: {
        parent?: KitchenItem,
    } = {}) {
        const { ingredient } = item;
        const { behaviors } = item;
        if (!ingredient.image) {
            return;
        }
        const texture = await getTextureByAsset(ingredient.image);
        let { tex, width, height } = texture;
        const transform = options.parent ? transformToMatrix(item.transform) :  getItemTransform(context, item, options);
        matrices.model.push();
        matrices.model.multiply(transform);
        if (context.held === item.id) {
            applyDragEffect();
        }
        if (side === 'client' && context.hovering === item.id) {
            draw.textureOutline(
                0, 0,
                width, height,
                tex,
                new Vec4(1, 0, 0, 1),
                10,
            );
        }
        draw.textureColor(
            10, 40,
            width + 10, height + 40,
            tex,
            new Vec4(0, 0, 0, 0.1),
        );
        draw.texture(
            0, 0,
            width, height,
            tex,
        );
        if (behaviors.container) {
            const container = behaviors.container;
            for (const item of container.items
                .map((id): KitchenItem | undefined => context.items[id])
                .filter((entry): entry is KitchenItem => !!entry)
                .sort((a, b) => {
                    const maxA = a.bounds.max;
                    const maxB = b.bounds.max;
                    return (a.transform.offset.y + maxA.y) - (b.transform.offset.y + maxB.y);
                })) {
                await renderItem(item, {
                    parent: item,
                });
            }
            if (container.overlay) {
                const transform = transformToMatrix(container.overlayTransform);
                matrices.model.push();
                matrices.model.multiply(transform);
                const containerTexture = await getTextureByAsset(container.overlay);
                let { tex, width, height } = containerTexture;
                draw.texture(
                    0, 0,
                    width, height,
                    tex,
                );
                matrices.model.pop();
            }
        }
        matrices.model.pop();
    }

    let scaleFactor = 1;

    async function renderCursor() {
        if (side !== 'client') return;
        if (!isMouseOver) return;
        const mouse = matrices.unprojectPoint(glMouse);
        const deltaMouse = matrices.unprojectPoint(glMouse).sub(matrices.unprojectPoint(glMouse.sub(deltaGlMouse)));
        matrices.model.push();
        matrices.view.push();
        matrices.model.multiply(new Mat4(
            1, -deltaMouse.y / 100, 0, 0,
            -deltaMouse.x / 100, 1, 0, 0,
            0, 0, 1, 0,
            mouse.x, mouse.y, 0, 1,
        ));
        const CURSORS = {
            grab: {
                image: await getTextureByUri(cursor_grab),
                width: 48,
                height: 48,
                x: -26,
                y: -26,
            },
            point: {
                image: await getTextureByUri(cursor_point),
                width: 48,
                height: 48,
                x: -4,
                y: -4,
            },
        }
        const cursor = context.held ? CURSORS.point : CURSORS.grab;
        const time = performance.now();
        const duration = time - (mouseDown ? mouseDownTime : mouseUpTime);
        const a = Math.sin(duration / 40) / (Math.pow(duration / 7, 1.5) / 2 + 1) * (mouseDown ? -1 : 1);
        const scale = 1 + a;
        matrices.model.scale(scale, scale, 1);
        matrices.view.translate(a * 70, a * 70, 0);

        draw.textureColor(
            cursor.x + 4,
            cursor.y + 10,
            cursor.width + cursor.x + 4,
            cursor.height + cursor.y + 10,
            cursor.image.tex,
            new Vec4(0.3, 0.2, 0.2, 0.05),
        );
        draw.textureOutline(
            cursor.x,
            cursor.y,
            cursor.width + cursor.x,
            cursor.height + cursor.y,
            cursor.image.tex,
            Vec4.ONE,
            2,
        );
        draw.texture(
            cursor.x,
            cursor.y,
            cursor.width + cursor.x,
            cursor.height + cursor.y,
            cursor.image.tex,
        );
        matrices.model.pop();
        matrices.view.pop();
    }

    function setupCounterProjection() {
        const { gl } = glContext;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrices.view.identity();
        matrices.view.translate(0, gl.canvas.height / 2, 0);
        matrices.view.scale(scaleFactor, scaleFactor, 1);
    }

    function setupHUDProjection() {
        const { gl } = glContext;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrices.view.identity();
    }

    async function renderHoveringItem() {
        const { hovering } = context;
        if (!hovering) return;
        const item = context.items[hovering];
        if (!item) return;
        await renderItem(item);
    }

    async function renderHeldItem() {
        const { held } = context;
        if (!held) return;
        const item = context.items[held];
        if (!item) return;
        const deltaMouse = matrices.unprojectPoint(glMouse).sub(matrices.unprojectPoint(glMouse.sub(deltaGlMouse)));
        item.transform.offset = {
            x: item.transform.offset.x + deltaMouse.x,
            y: item.transform.offset.y + deltaMouse.y,
        }
        await renderItem(item);
    }

    function processDrop(hoveringItem: KitchenItem, heldItem: KitchenItem) {
        const { ingredient: heldIng} = heldItem;
        const { ingredient: hoveringIng} = hoveringItem;
        const { behaviors: heldBehaves } = heldItem;
        const { behaviors: hoverBehaves } = hoveringItem;
        if (hoverBehaves.container) {
            const container = hoverBehaves.container;
            if (container.items.includes(heldItem.id)) {
                return;
            }
            container.items = [
                ...container.items,
                heldItem.id,
            ];
            attachChildren(hoveringItem, heldItem);
            const containerTransform = getItemTransform(context, hoveringItem);
            const heldTransform = transformToMatrix(heldItem.transform);
            const inverse = containerTransform.inverse();
            const newMatrix = inverse.multiply(heldTransform);
            heldItem.transform = {
                right: new Vec2(newMatrix.m00, newMatrix.m01),
                up: new Vec2(newMatrix.m10, newMatrix.m11),
                offset: new Vec2(newMatrix.m30, newMatrix.m31),
            };
        }
    }

    function processClick(hoveringItem: KitchenItem) {
        const parent = hoveringItem.parent ? context.items[hoveringItem.parent] : undefined;
        if (parent) {
            callBehaviorHandler(context, parent, it => it.handleClickChild, {
                child: hoveringItem,
            });
        }
        const canBeHeld = callBehaviorHandler(context, hoveringItem, it => it.canItemBeHeld, {
            canBeHeld: true,
        }).canBeHeld;
        if (!canBeHeld) return;
        context.held = hoveringItem.id;
    }

    async function updateMouse() {
        if (side !== 'client') return;
        const { gl } = glContext;
        const lastGlMouse = glMouse;
        const rect = canvas.getBoundingClientRect();
        glMouse = clientMouse
            .remap(
                new Vec2(rect.left, rect.top),
                new Vec2(gl.canvas.width, gl.canvas.height),
                new Vec2(-1, 1),
                new Vec2(1, -1),
            );
        deltaGlMouse = glMouse.sub(lastGlMouse);

        if ($scene.type !== 'cooking') {
            context.held = null;
            context.hovering = null;
            return;
        }
        let hit = false;
        const itemsInOrder: KitchenItem[] = [];
        function collectItems(item: KitchenItem, passed: string[]) {
            const children = item.children
                .map((id) => context.items[id])
                .filter((entry): entry is KitchenItem => !!entry)
                .sort((a, b) => {
                    const maxA = a.bounds.max;
                    const maxB = b.bounds.max;
                    return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
                });
            for (const child of children) {
                collectItems(child, [...passed, item.id]);
            }
            if (passed.includes(item.id)) {
                console.error('Circular reference detected:', passed.join(' -> '), '->', item.id);
                return;
            }
            itemsInOrder.push(item);
        }
        for (const [id, item] of Object.entries(context.items).sort(([, a], [, b]) => {
            const maxA = a.bounds.max;
            const maxB = b.bounds.max;
            return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
        })) {
            if (!item.parent) {
                collectItems(item, []);
            }
        }
        for (const item of itemsInOrder) {
            if (item.id === context.held) continue;
            const hovered = await isItemHovering(item);
            if (hovered) {
                if (context.hovering === item.id) {
                    hit = true;
                    break;
                }
                context.hovering = item.id;
                hit = true;
                break;
            }
        }
        if (!hit && context.hovering) {
            context.hovering = null;
        }
    }

    async function handleMouseDown() {
        if (side !== 'client') return;
        if (context.hovering) {
            const hoveringItem = context.items[context.hovering];
            processClick(hoveringItem);
        }
    }

    async function handleMouseUp() {
        if (side !== 'client') return;
        if (!context.held) return;
        const { held, hovering } = context;
        if (held && hovering) {
            const heldItem = context.items[held];
            const hoverItem = context.items[hovering];
            if (heldItem.parent) {
                processDrop(hoverItem, heldItem);
            } else {
                processDrop(hoverItem, heldItem);
            }
        }
        context.held = null;
    }

    async function renderItems() {
        for (const [id, item] of Object.entries(context.items).sort(([, a], [, b]) => {
            const maxA = a.bounds.max;
            const maxB = b.bounds.max;
            return (a.transform.offset.y + maxA.y) - (b.transform.offset.y + maxB.y);
        })) {
            if (id === context.held) continue;
            if (id === context.hovering) continue;
            if (item.parent) continue;
            if (item.type === 'ingredient') {
                await renderItem(item);
            }
        }
    }

    function markChanged() {
        changed = true;
    }

    function syncData() {
        if (!changed) return;
        changed = false;
        const time = performance.now();
        const delta = time - lastUpdate;
        if (delta < 1000 / UPDATE_RATE) {
            return;
        }
        lastUpdate = time;
        $states.kitchen = {...context};
    }

    async function renderScreen() {
        const { gl } = glContext;
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
    }

    async function render(context: GlContext) {
        if (!omu.ready) return;

        const { gl } = context;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        
        const rect = canvas.getBoundingClientRect();
        scaleFactor = rect.width / COUNTER_WIDTH;
        setupCounterProjection();
        await updateMouse();
        
        draw.rectangle(0, 0, gl.canvas.width / scaleFactor, gl.canvas.height / scaleFactor, new Vec4(0.8, 0.8, 0.8, 1));
        draw.rectangle(0, 0, gl.canvas.width / scaleFactor, COUNTER_HEIGHT, new Vec4(1, 1, 1, 1));
        
        await renderItems();
        await renderHoveringItem();
        await renderHeldItem();
        setupHUDProjection();
        await renderScreen();
        await renderCursor();
        if (side === 'client') {
            syncData();
        }
    }

    $: {
        if (side === 'asset') {
            context = {
                ...$states.kitchen,
                side,
            }
        }
    }
</script>

<svelte:window
    on:mousemove={(e) => {
        clientMouse = new Vec2(e.clientX, e.clientY);
        isMouseOver = true;
        markChanged();
    }}
    on:mousedown={() => {
        mouseDown = true;
        mouseDownTime = performance.now();
        handleMouseDown();
    }}
    on:mouseup={() => {
        mouseDown = false;
        mouseUpTime = performance.now();
        handleMouseUp();
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
    {#if side === 'client'}
        <div class="ui">
            {#each Object.entries($config.ingredients) as [id, ingredient] (id)}
                <button on:click={() => {
                    const itemId = Date.now().toString();
                    context.items = {
                        ...context.items,
                        [itemId]: createKitchenItem(
                            itemId,
                            ingredient,
                        ),
                    };
                    markChanged();
                }}>
                    {ingredient.name}
                </button>
            {/each}
            <button on:click={() => {
                context.items = {};
                markChanged();
            }}>
                全部消す
            </button>
        </div>
    {/if}
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

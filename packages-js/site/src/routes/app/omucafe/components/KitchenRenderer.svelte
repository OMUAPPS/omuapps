<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Draw } from '$lib/components/canvas/draw.js';
    import type { GlContext, GlTexture } from '$lib/components/canvas/glcontext.js';
    import { Matrices } from '$lib/components/canvas/matrices.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { fetchAudio, fetchImage, getAsset, type Asset } from '../game/asset.js';
    import { createContainer } from '../game/behavior/container.js';
    import { createFixed } from '../game/behavior/fixed.js';
    import type { Effect } from '../game/effect.js';
    import { createItemState, getItemStateTransform, invokeBehaviors, loadBehaviorHandlers, type ItemState } from '../game/item-state.js';
    import { createItem } from '../game/item.js';
    import type { KitchenContext } from '../game/kitchen.js';
    import { transformToMatrix } from '../game/transform.js';
    import background from '../images/background.png';
    import background2 from '../images/background2.png';
    import counter from '../images/counter.png';
    import cursor_grab from '../images/cursor_grab.png';
    import cursor_point from '../images/cursor_point.png';
    import effect from '../images/effect.png';
    import kitchen from '../images/kitchen.png';
    import overlay from '../images/overlay.png';
    import overlay2 from '../images/overlay2.png';
    import overlay3 from '../images/overlay3.png';
    import { getGame } from '../omucafe-app.js';

    const { scene, states, config, omu } = getGame();

    export let side: 'client' | 'background' | 'overlay' = 'client';
    const COUNTER_WIDTH = 1920;
    const COUNTER_HEIGHT = 500;
    const UPDATE_RATE = 60;
    let context: KitchenContext = {
        ...$states.kitchen,
        side,
        renderItem: (itemState, options) => renderItem(itemState, options),
        getTextureByAsset: (asset) => getTextureByAsset(asset),
        getConfig: () => $config,
        setConfig: (value) => $config = value,
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
        const image = await getAsset(asset).then(fetchImage);
        return getTexture(key, image);
    }

    async function init(gl: GlContext) {
        matrices = new Matrices();
        draw = new Draw(matrices, gl);
        await loadBehaviorHandlers();
        if (side === 'client') {
            const counterTex = await getTextureByUri(counter);
            const existCounter = context.items['counter'];
            const item = createItem({
                id: 'counter',
                name: 'カウンター',
                image: {
                    type: 'url',
                    url: counter,
                },
                bounds: {
                    min: Vec2.ZERO,
                    max: new Vec2(counterTex.width, counterTex.height),
                },
                behaviors: {
                    fixed: createFixed(),
                    container: existCounter?.behaviors.container ?? createContainer(),
                },
                transform: {
                    right: Vec2.RIGHT,
                    up: Vec2.UP,
                    offset: new Vec2(0, -COUNTER_HEIGHT),
                }
            });
            createItemState(context, {
                id: 'counter',
                item,
                children: existCounter?.children,
            });
        }
    }

    async function isItemHovering(item: ItemState): Promise<boolean> {
        if (!item.item.image) return false;
        const { bounds } = item;
        const { min, max } = bounds;
        const matrix = getItemStateTransform(context, item);
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

        const texture = await getTextureByAsset(item.item.image);
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
        return alpha > 128;
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

    async function renderItem(itemState: ItemState, options: {
        parent?: ItemState,
    } = {}) {
        const { item } = itemState;
        if (!item.image) {
            return;
        }
        const texture = await getTextureByAsset(item.image);
        let { tex, width, height } = texture;
        const transform = options.parent ? transformToMatrix(itemState.transform) : getItemStateTransform(context, itemState, options);
        matrices.model.push();
        matrices.model.multiply(transform);
        if (context.held === item.id) {
            applyDragEffect();
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
        await invokeBehaviors(context, itemState, it => it.render, {
            gl: glContext,
            draw,
            matrices,
        });
        matrices.model.pop();
    }

    let scaleFactor = 1;

    async function renderCursor() {
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

    function setupBackgroundProjection() {
        const { gl } = glContext;
        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrices.view.identity();
    }

    function setupCounterProjection() {
        const { gl } = glContext;

        matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrices.view.identity();
        matrices.view.translate(0, gl.canvas.height / 2 - 100, 0);
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
        const itemState = context.items[hovering];
        if (!itemState) return;
        const { item } = itemState;
        if (!item.image) {
            return;
        }
        const { canBeHeld } = await invokeBehaviors(context, itemState, it => it.canItemBeHeld, {
            canBeHeld: true,
        });
        if (!context.held && !canBeHeld) {
            return;
        }
        const alpha = context.held ? 1 : 0.5;
        const color = new Vec4(0, 0, 0, alpha);
        const texture = await getTextureByAsset(item.image);
        let { tex, width, height } = texture;
        const transform = getItemStateTransform(context, itemState);
        matrices.model.push();
        matrices.model.multiply(transform);
        if (context.held === itemState.id) {
            applyDragEffect();
        }
        draw.textureOutline(
            0, 0,
            width, height,
            tex,
            color,
            8,
        );
        draw.textureOutline(
            0, 0,
            width, height,
            tex,
            new Vec4(1, 1, 1, 1),
            4,
        );
        matrices.model.pop();
        await invokeBehaviors(context, itemState, it => it.renderItemHoverTooltip, {
            x: glMouse.x,
            y: glMouse.y,
        });
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

    async function processDrop(hoveringItem: ItemState, heldItem: ItemState) {
        await invokeBehaviors(context, hoveringItem, it => it.handleDropChild, {
            child: heldItem,
        });
    }

    async function processClick(hoveringItem: ItemState) {
        const parent = hoveringItem.parent ? context.items[hoveringItem.parent] : undefined;
        if (parent) {
            await invokeBehaviors(context, parent, it => it.handleClickChild, {
                child: hoveringItem,
            });
        }
        await invokeBehaviors(context, hoveringItem, it => it.handleClick, {
            x: 0,
            y: 0,
        });
        const canBeHeld = (await invokeBehaviors(context, hoveringItem, it => it.canItemBeHeld, {
            canBeHeld: true,
        })).canBeHeld;
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
        const itemsInOrder: ItemState[] = [];
        function collectItems(item: ItemState, passed: string[]) {
            const children = item.children
                .map((id) => context.items[id])
                .filter((entry): entry is ItemState => !!entry)
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

    async function updateEffects() {
        const effects: Effect[] = [];
        for (const item of Object.values(context.items)) {
            effects.push(...Object.values(item.effects));
        }
        for (const effect of effects) {
            const { audio, particle } = effect.attributes;
            if (audio) {
                const { asset, volume } = audio;
                const audioResource = await getAsset(asset).then(fetchAudio);
                audioResource.volume = volume;
                audioResource.play();
            }
        }
    }

    async function updateAudio() {
    }

    async function update() {
        await updateMouse();
        await updateEffects();
        await updateAudio();
    }

    async function handleMouseDown() {
        if (side !== 'client') return;
        if (context.hovering) {
            const hoveringItem = context.items[context.hovering];
            await processClick(hoveringItem);
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
                await processDrop(hoverItem, heldItem);
            } else {
                await processDrop(hoverItem, heldItem);
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
            if (item.parent) continue;
            if (item.id === 'counter') continue;
            await renderItem(item);
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
        $states.kitchen = {
            items: context.items,
            held: context.held,
            hovering: context.hovering,
            mouse: glMouse,
        };
    }

    async function renderScreen() {
        const { gl } = glContext;
        const { width, height } = gl.canvas;
        if ($scene.type === 'item_edit') {
            draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(1, 1, 1, 0.5));
            matrices.view.push();
            matrices.view.translate(width / 2, height / 2, 0);
            const ingredient = $config.items[$scene.id];
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
            await renderItem(createItemState(context, {
                id: 'preview',
                item: ingredient,
            }));
            delete context.items['preview'];
            matrices.view.pop();
        }
    }

    async function renderCounter() {
        const kitchenTex = await getTextureByUri(kitchen);
        matrices.model.push();
        matrices.model.translate(0, 150, 0);
        // Kitchen
        draw.texture(
            0, 0,
            kitchenTex.width, kitchenTex.height,
            kitchenTex.tex,
        );
        matrices.model.pop();
    }

    async function renderBackground() {
        const tex = side === 'background' ? await getTextureByUri(background2) : await getTextureByUri(background);
        // Background
        // fit to screen
        const { width, height } = glContext.gl.canvas;
        const scale = height / tex.height;
        draw.texture(
            0, 0,
            tex.width * scale, height,
            tex.tex,
        );
    }

    async function renderEffect() {
        const gl = glContext.gl;
        // multiply
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        const effectTex = await getTextureByUri(effect);
        // Background
        // fit to screen
        const { width, height } = glContext.gl.canvas;
        const aspect = effectTex.width / effectTex.height;
        const scale = Math.max(width / effectTex.width, height / effectTex.height);
        const scaledWidth = effectTex.width * scale;
        const scaledHeight = effectTex.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        draw.texture(
            x, y,
            scaledWidth, scaledHeight,
            effectTex.tex,
        );
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    async function renderOverlay() {
        const gl = glContext.gl;
        if (side === 'client') {
            const tex = await getTextureByUri(overlay2);
            draw.texture(
                0, 0,
                gl.canvas.width, gl.canvas.height,
                tex.tex,
            );
        } else {
            const tex = await getTextureByUri(overlay);
            draw.texture(
                0, 0,
                gl.canvas.width, gl.canvas.height,
                tex.tex,
            );
        }
    }

    async function renderOverlay2() {
        const gl = glContext.gl;
        if (side === 'overlay') {
            const tex = await getTextureByUri(overlay3);
            const { width, height } = gl.canvas;
            const scale = Math.min(height / tex.height, 1.5);
            draw.texture(
                0, height - tex.height * scale,
                tex.width * scale, height,
                tex.tex,
            );
        // fit height
            // const { width, height } = gl.canvas;
            // const halfWidth = tex.width / 2;
            // const scale = width / halfWidth;
            // const min = new Vec2(width / 2 - halfWidth * scale, 0);
            // const max = new Vec2(width / 2 + halfWidth * scale, height);
            // draw.texture(
            //     min.x, min.y,
            //     max.x, max.y,
            //     tex.tex,
            // );
        }
    }

    async function render(gl: GlContext) {
        if (!omu.ready) return;

        const { gl: glInternal } = gl;
        glInternal.viewport(0, 0, glInternal.canvas.width, glInternal.canvas.height);
        glInternal.clearColor(0, 0, 0, 0);
        glInternal.clear(glInternal.COLOR_BUFFER_BIT);
        glInternal.enable(glInternal.BLEND);
        glInternal.blendFuncSeparate(glInternal.SRC_ALPHA, glInternal.ONE_MINUS_SRC_ALPHA, glInternal.ONE, glInternal.ONE_MINUS_SRC_ALPHA);
        
        const rect = canvas.getBoundingClientRect();
        scaleFactor = rect.width / COUNTER_WIDTH;
        setupBackgroundProjection();
        if (side !== 'overlay') {
            await renderBackground();
        }
        if (side === 'overlay') {
            await renderEffect();
        }
        
        if (side !== 'background') {
            setupCounterProjection();
            await update();
            await renderCounter();
            await renderItems();
            if (context.items['counter']) {
                await renderItem(context.items['counter']);
            }
        }
        
        setupHUDProjection();
        if (side !== 'background') {
            await renderOverlay();
            setupCounterProjection();
            if (context.items['counter']) {
                await renderItem(context.items['counter']);
            }
            if (side === 'client') {
                await renderHoveringItem();
            }
            await renderHeldItem();
            setupHUDProjection();
            await renderOverlay2();
        }

        await renderScreen();
        await renderCursor();
        if (side === 'client') {
            syncData();
        }
    }

    $: {
        if (side !== 'client') {
            context = {
                ...$states.kitchen,
                renderItem: (itemState, options) => renderItem(itemState, options),
                getTextureByAsset: (asset) => getTextureByAsset(asset),
                side,
                getConfig: () => $config,
                setConfig: (value) => $config = value,
            }
        }
    }

    let showDebug = false;
    let openItems: string[] = [];
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
        <div class="debug" class:show-debug={showDebug}>
            <h2>
                {JSON.stringify(context).length}
                <button on:click={() => showDebug = !showDebug}>
                    {showDebug ? 'hide' : 'show'}
                </button>
            </h2>
            {#each Object.values(context.items) as item (item.id)}
                <div>
                    <button on:click={() => {
                        openItems = openItems.includes(item.id) ? openItems.filter(id => id !== item.id) : [...openItems, item.id];
                    }}>
                        {item.item.id}
                    </button>
                    {#if openItems.includes(item.id)}
                        <pre>{JSON.stringify(item, null, 2)}</pre>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="ui">
            {#each Object.entries($config.items) as [id, item] (id)}
                <button on:click={() => {
                    const itemState = createItemState(context, {
                        item,
                    });
                    if (!item.behaviors.fixed) {
                        itemState.transform.offset = new Vec2(COUNTER_WIDTH / 3, 200);
                    }
                    markChanged();
                }}>
                    {item.name}
                </button>
            {/each}
            <button on:click={() => {
                for (const id in context.items) {
                    if (id === 'counter') continue;
                    delete context.items[id];
                }
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

    .debug {
        position: absolute;
        left: 0;
        top: 10rem;
        padding: 1rem;
        overflow-y: auto;
        z-index: 1;
        background: var(--color-bg-2);
        height: 4rem;

        &.show-debug {
            height: 70%;
        }
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

    button {
        padding: 0.5rem;
        background: white;
        border: 1px solid black;
        cursor: pointer;
    }
</style>

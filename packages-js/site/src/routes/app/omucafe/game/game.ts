import { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext } from '$lib/components/canvas/glcontext.js';
import { Matrices } from '$lib/components/canvas/matrices.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import bell from '../images/bell.png';
import counter from '../images/counter.png';
import kitchen from '../images/kitchen.png';
import { getTextureByUri } from './asset.js';
import { createContainer } from './behavior/container.js';
import { createItemState, invokeBehaviors, ITEM_LAYERS, loadBehaviorHandlers, renderHeldItem, renderHoveringItem, renderItems, renderItemState, updateHoveringItem, type ItemState } from './item-state.js';
import { createItem } from './item.js';
import type { KitchenContext } from './kitchen.js';

export const COUNTER_WIDTH = 1920;
export const COUNTER_HEIGHT = 500;
export const UPDATE_RATE = 60;
export let lastUpdate = Time.get();
export let changed = false;
export let glContext: GlContext;
export let matrices: Matrices;
export let canvas: HTMLCanvasElement;
export const mouse = {
    over: false,
    client: Vec2.ZERO,
    position: Vec2.ZERO,
    delta: Vec2.ZERO,
    gl: Vec2.ZERO,
    deltaGl: Vec2.ZERO,
    down: false,
    downTime: 0,
    upTime: 0,
}
export let scaleFactor = 1;
export let draw: Draw;

export let side: 'client' | 'background' | 'overlay' = 'client';
let context: KitchenContext;
export function setContext(ctx: KitchenContext) {
    side = ctx.side;
    context = ctx;
}
export function getContext(): KitchenContext {
    if (!context) {
        throw new Error('Context is not set');
    }
    return context;
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
        canBeHeld: false,
    })).canBeHeld;
    if (!canBeHeld) return;
    context.held = hoveringItem.id;
}

async function handleMouseDown() {
    if (side !== 'client') return;
    if (context?.hovering) {
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

function syncData() {
    if (!changed) return;
    changed = false;
    const time = Time.get();
    const delta = time - lastUpdate;
    if (delta < 1000 / UPDATE_RATE) {
        return;
    }
    lastUpdate = time;
    const { states, scene, gameConfig } = getGame();
    states.set({
        ...context.states,
        kitchen: {
            audios: context.audios,
            items: context.items,
            held: context.held,
            hovering: context.hovering,
            mouse: mouse.gl,
        }
    });
}

export function markChanged() {
    changed = true;
}

let renderLock: Promise<void> | null = null;

export function acquireRenderLock() {
    if (renderLock) {
        return renderLock;
    }
}

function registerMouseEvents() {
    window.addEventListener('mousemove', async (e) => {
        await acquireRenderLock();
        mouse.client = new Vec2(e.clientX, e.clientY);
        mouse.over = true;
        markChanged();
    });
    window.addEventListener('mousedown', async () => {
        await acquireRenderLock();
        mouse.down = true;
        mouse.downTime = Time.get();
        handleMouseDown();
        markChanged();
    });
    window.addEventListener('mouseup', async () => {
        await acquireRenderLock();
        mouse.down = false;
        mouse.upTime = Time.get();
        handleMouseUp();
        markChanged();
    });
    window.addEventListener('mouseout', async () => {
        await acquireRenderLock();
        mouse.over = false;
    });
    window.addEventListener('mouseenter', async () => {
        await acquireRenderLock();
        mouse.over = true;
    });
    window.addEventListener('mouseleave', async () => {
        await acquireRenderLock();
        mouse.over = false;
    });
}

export async function init(ctx: GlContext) {
    glContext = ctx;
    registerMouseEvents();
    matrices = new Matrices();
    matrices.width = ctx.gl.canvas.width;
    matrices.height = ctx.gl.canvas.height;
    draw = new Draw(matrices, ctx);
    await loadBehaviorHandlers();
    if (side === 'client') {
        const counterTex = await getTextureByUri(counter);
        const existCounter = context.items['counter'];
        const counterItem = createItem({
            id: 'counter',
            name: 'カウンター',
            image: {
                type: 'url',
                url: counter,
            },
            bounds: {
                min: Vec2.ZERO,
                max: { x: counterTex.width, y: counterTex.height },
            },
            behaviors: {
                container: existCounter?.behaviors.container ?? createContainer(),
            },
            transform: {
                right: Vec2.RIGHT,
                up: Vec2.UP,
                offset: { x: 0, y: -COUNTER_HEIGHT },
            }
        });
        createItemState(context, {
            id: 'counter',
            item: counterItem,
            layer: ITEM_LAYERS.COUNTER,
            children: existCounter?.children,
        });
        const bellTex = await getTextureByUri(bell);
        const existbell = context.items['bell'];
        const bellItem = createItem({
            id: 'bell',
            name: 'ベル',
            image: {
                type: 'url',
                url: bell,
            },
            bounds: {
                min: Vec2.ZERO,
                max: { x: bellTex.width, y: bellTex.height },
            },
            behaviors: {
                action: createAction({
                    on: {
                        click: 'bell_click',
                    },
                }),
            },
            transform: createTransform2(
                Vec2.ONE,
                0,
                { x: 0, y: 0 },
            )
        });
        createItemState(context, {
            id: 'bell',
            item: bellItem,
            layer: ITEM_LAYERS.BELL,
            children: existbell?.children,
        });
    }
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

export function applyDragEffect() {
    matrices.model.multiply(new Mat4(
        1, -mouse.delta.y / 1000, 0, 0,
        -mouse.delta.x / 1000, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ));
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


import { createTransform2, transformToMatrix } from './transform.js';

async function updateMouse() {
    if (side !== 'client') return;
    const { gl } = glContext;
    const scene = context.scene;
    const glMouse = mouse.client.remap(
        Vec2.ZERO,
        {x: gl.canvas.width, y: gl.canvas.height},
        {x: -1, y: 1},
        {x: 1, y: -1},
    );
    mouse.deltaGl = glMouse.sub(mouse.gl);
    mouse.gl = glMouse;
    const position = matrices.unprojectPoint(mouse.gl);
    mouse.delta = position.sub(mouse.position);
    mouse.position = position;

    if (scene.type !== 'cooking') {
        context.held = null;
        context.hovering = null;
        return;
    }
    await updateHoveringItem();
}

async function update() {
    await updateMouse();
    if (side === 'client') {
        await updateAudioClips(Time.get());
    }
}

import { getGame } from '../omucafe-app.js';
import { updateAudioClips } from './audioclip.js';
import { createAction } from './behavior/action.js';
import { renderBackground, renderEffect, renderOverlay, renderOverlay2 } from './renderer/background.js';
import { renderCursor } from './renderer/cursor.js';
import { renderParticles } from './renderer/particle.js';
import { Time } from './time.js';

async function renderScreen() {
    const { gl } = glContext;
    const { width, height } = gl.canvas;
    const scene = context.scene;
    if (scene.type === 'item_edit') {
        draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(1, 1, 1, 0.5));
        matrices.view.push();
        matrices.view.translate(width / 2, height / 2, 0);
        const ingredient = context.config.items[scene.id];
        const transform = transformToMatrix(ingredient.transform);
        const { min, max } = ingredient.bounds;
        const offset = new Vec2(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
        ).mul({
            x: transform.m00,
            y: transform.m11,
        });
        matrices.view.translate(-offset.x, -offset.y, 0);
        await renderItemState(createItemState(context, {
            id: 'preview',
            item: ingredient,
        }));
        delete context.items['preview'];
        matrices.view.pop();
    }
}

export async function renderBackgroundSide() {
    if (side !== 'background') return;

    setupBackgroundProjection();
    await renderBackground();
    
    setupHUDProjection();

    await renderScreen();
    await renderCursor();
}

export async function renderClientSide() {
    if (side !== 'client') return;

    setupBackgroundProjection();
    await renderBackground();

    setupCounterProjection();
    await update();
    await renderCounter();
    await renderItems(ITEM_LAYERS.COUNTER);
    await renderItems(ITEM_LAYERS.KITCHEN_ITEMS);
    await renderItems(ITEM_LAYERS.BELL);
    
    setupHUDProjection();
    await renderOverlay();
    setupCounterProjection();
    await renderHoveringItem();
    await renderHeldItem();
    await renderParticles();
    setupHUDProjection();
    await renderOverlay2();

    await renderScreen();
    await renderCursor();
    syncData();
}

export async function renderOverlaySide() {
    if (side !== 'overlay') return;

    setupBackgroundProjection();
    await renderEffect();
    
    setupCounterProjection();
    const scene = context.scene;
    if (scene.type === 'photo_mode') {
        const { time } = scene;
        const elapsed = Time.get() - time;
        console.log('elapsed', elapsed);
        matrices.view.push();
        matrices.view.translate(0, 1000 - 1000 / (elapsed / 1000 + 1), 0);
        await update();
        await renderCounter();
        await renderItems(ITEM_LAYERS.KITCHEN_ITEMS);
        matrices.view.pop();
        setupHUDProjection();
        await renderOverlay();
        setupCounterProjection();
        await renderHeldItem();
        await renderParticles();
        await renderItems(ITEM_LAYERS.COUNTER);
        await renderItems(ITEM_LAYERS.BELL);
        setupHUDProjection();
        await renderOverlay2();
    
        await renderScreen();
        await renderCursor();
    } else {
        await update();
        await renderCounter();
        await renderItems(ITEM_LAYERS.KITCHEN_ITEMS);
        setupHUDProjection();
        await renderOverlay();
        setupCounterProjection();
        await renderHeldItem();
        await renderParticles();
        await renderItems(ITEM_LAYERS.COUNTER);
        await renderItems(ITEM_LAYERS.BELL);
        setupHUDProjection();
        await renderOverlay2();
    
        await renderScreen();
        await renderCursor();
    }
}

export async function render(gl: GlContext): Promise<void> {
    matrices.width = gl.gl.canvas.width;
    matrices.height = gl.gl.canvas.height;
    let resolved = () => {};
    renderLock = new Promise<void>(resolve => {
        resolved = resolve;
    });
    const { gl: glInternal } = gl;
    glInternal.viewport(0, 0, glInternal.canvas.width, glInternal.canvas.height);
    glInternal.clearColor(0, 0, 0, 0);
    glInternal.clear(glInternal.COLOR_BUFFER_BIT);
    glInternal.enable(glInternal.BLEND);
    glInternal.blendFuncSeparate(glInternal.SRC_ALPHA, glInternal.ONE_MINUS_SRC_ALPHA, glInternal.ONE, glInternal.ONE_MINUS_SRC_ALPHA);
    
    const rect = {
        width: glInternal.canvas.width,
        height: glInternal.canvas.height,
    }
    scaleFactor = rect.width / COUNTER_WIDTH;

    if (side === 'client') {
        await renderClientSide();
        syncData();
    } else if (side === 'background') {
        await renderBackgroundSide();
    } else if (side === 'overlay') {
        await renderOverlaySide();
    }
    resolved();
}

import { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Matrices } from '$lib/components/canvas/matrices.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import bell from '../images/bell.png';
import counter from '../images/counter.png';
import kitchen from '../images/kitchen.png';
import photo_frame from '../images/photo_frame.svg';
import { getTextureByUri } from './asset.js';
import { createContainer } from './behavior/container.js';
import { createItemState, invokeBehaviors, ITEM_LAYERS, loadBehaviorHandlers, markItemStateChanged, renderHeldItem, renderHoveringItem, renderItems, renderItemState, updateHoveringItem, type ItemState } from './item-state.js';
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
    ui: false,
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
let frameBuffer: GlFramebuffer;
let frameBufferTexture: GlTexture;
let drawFrameBuffer: GlFramebuffer;
let drawFrameBufferTexture: GlTexture;

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
    const { states } = getGame();
    states.set({
        ...context.states,
        kitchen: {
            audios: context.audios,
            items: context.items,
            held: context.held,
            hovering: context.hovering,
            mouse: {
                position: mouse.gl,
                delta: mouse.deltaGl,
                over: mouse.over,
                ui: mouse.ui,
            },
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function markChanged(...args: unknown[]) {
    changed = true;
}

let renderLock: Promise<void> | null = null;

export function acquireRenderLock() {
    if (renderLock) {
        return renderLock;
    }
}

const inputQueue: (() => Promise<void>)[] = [];

function registerMouseEvents() {
    window.addEventListener('mousemove', async (e) => {
        inputQueue.push(async () => {
            mouse.client = new Vec2(e.clientX, e.clientY);
            mouse.over = true;
            markChanged();
        });
    });
    window.addEventListener('mousedown', async () => {
        inputQueue.push(async () => {
            mouse.down = true;
            mouse.downTime = Time.get();
            handleMouseDown();
            markChanged();
        });
    });
    window.addEventListener('mouseup', async () => {
        inputQueue.push(async () => {
            mouse.down = false;
            mouse.upTime = Time.get();
            handleMouseUp();
            markChanged();
        });
    });
    window.addEventListener('touchstart', async (e) => {
        e.preventDefault();
        inputQueue.push(async () => {
            mouse.down = true;
            mouse.downTime = Time.get();
            mouse.client = new Vec2(e.touches[0].clientX, e.touches[0].clientY);
            mouse.over = true;
            markChanged();
            handleMouseDown();
        });
    });
    window.addEventListener('touchend', async () => {
        inputQueue.push(async () => {
            mouse.down = false;
            mouse.upTime = Time.get();
            handleMouseUp();
            markChanged();
        });
    });
    window.addEventListener('touchmove', async (e) => {
        e.preventDefault();
        inputQueue.push(async () => {
            mouse.client = new Vec2(e.touches[0].clientX, e.touches[0].clientY);
            mouse.over = true;
            markChanged();
        });
    });
    window.addEventListener('mouseout', async () => {
        inputQueue.push(async () => {
            mouse.over = false;
        });
    });
    window.addEventListener('mouseleave', async () => {
        inputQueue.push(async () => {
            mouse.over = false;
        });
    });
    window.addEventListener('mouseenter', async () => {
        inputQueue.push(async () => {
            mouse.over = true;
        });
    });
}

export async function init(ctx: GlContext) {
    const { paintSignal, paintEvents, gameConfig } = getGame();
    glContext = ctx;
    registerMouseEvents();
    matrices = new Matrices();
    matrices.width = ctx.gl.canvas.width;
    matrices.height = ctx.gl.canvas.height;
    draw = new Draw(matrices, ctx);
    frameBuffer = ctx.createFramebuffer();
    frameBufferTexture = ctx.createTexture();
    frameBufferTexture.use(() => {
        frameBufferTexture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
    });
    frameBuffer.use(() => {
        frameBuffer.attachTexture(frameBufferTexture);
    });
    drawFrameBuffer = ctx.createFramebuffer();
    drawFrameBufferTexture = ctx.createTexture();
    drawFrameBufferTexture.use(() => {
        drawFrameBufferTexture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
    });
    drawFrameBuffer.use(() => {
        drawFrameBuffer.attachTexture(drawFrameBufferTexture);
    });
    await getTextureByUri(photo_frame);
    if (side !== 'client') {
        paintSignal.listen((events) => {
            paintQueue.push(...events);
        });
    }
    await once((resolve) => paintEvents.subscribe((buffer) => {
        paintQueue.push(...buffer.read());
        resolve();
    }));
    await once((resolve) => gameConfig.subscribe((gameConfig) => {
        paintTools.pen = gameConfig.photo_mode.pen;
        paintTools.eraser = gameConfig.photo_mode.eraser;
        resolve();
    }));
        
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

async function updateMouseClient() {
    if (side !== 'client') {
        throw new Error('Mouse is not in client side');
    }
    const { gl } = glContext;
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

    for (const event of inputQueue) {
        await event();
    }
    inputQueue.length = 0;
}

function updateMouseAsset() {
    if (side === 'client') {
        throw new Error('Mouse is not in asset side');
    }
    const ctx = getContext();
    mouse.gl = Vec2.from(ctx.mouse.position);
    mouse.deltaGl = mouse.gl.sub(mouse.position);
    const position = matrices.unprojectPoint(ctx.mouse.position);
    mouse.delta = position.sub(mouse.position);
    mouse.position = position;
    mouse.over = ctx.mouse.over;
    mouse.ui = ctx.mouse.ui;
}

async function update() {
    if (side === 'client') {
        await updateAudioClips(Time.get());
    }
}

import { once } from '$lib/helper.js';
import { Axis } from '$lib/math/axis.js';
import { Bezier } from '$lib/math/bezier.js';
import { DEFAULT_ERASER, DEFAULT_PEN, getGame, PAINT_EVENT_TYPE, PaintBuffer, type Eraser, type PaintEvent, type Pen } from '../omucafe-app.js';
import { updateAudioClips } from './audioclip.js';
import { createAction } from './behavior/action.js';
import { copy } from './helper.js';
import { renderBackground, renderEffect, renderOverlay, renderOverlay2 } from './renderer/background.js';
import { renderCursor } from './renderer/cursor.js';
import { renderParticles } from './renderer/particle.js';
import { Time } from './time.js';

function getScreenTime(time: number) {
    const elapsed = Time.get() - time;
    const t = 1 / Math.pow(elapsed / 250 + 1, 3) * (1 - (4000 / elapsed + 1) * 0.1);
    return t;
}

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
        const previewItemState = createItemState(context, {
            id: 'preview',
            item: ingredient,
        });
        markItemStateChanged(previewItemState);
        await renderItemState(previewItemState, {
            showRenderBounds: true,
        });
        delete context.items['preview'];
        matrices.view.pop();
    } else if (scene.type === 'photo_mode') {
        const t = getScreenTime(scene.time);
        const photoMode = context.config.photo_mode;
        const client = side === 'client';
        const screenScale = client ? scaleFactor * 0.7 : scaleFactor;
        const offsetY = client ? matrices.height / 2 - matrices.height * 0.07 - 50 : matrices.height / 2;
        await matrices.view.scopeAsync(async () => {
            matrices.view.translate(matrices.width / 2, offsetY, 0);
            matrices.view.scale(screenScale, screenScale, 1);
            matrices.view.translate(100 * t, 1000 * t, 0);
            matrices.view.rotate(Axis.Z_POS.rotateDeg(4.74 / 7 - 10 * t));
            const scale = Math.pow(1.24, photoMode.scale * 0.5);
            matrices.view.scale(scale, scale, 1);
            if (photoMode.tool.type === 'move') {
                await updateHoveringItem([ITEM_LAYERS.PHOTO_MODE]);
            } else {
                context.hovering = null;
                context.held = null;
            }
            await renderItems([ITEM_LAYERS.PHOTO_MODE]);
            await renderHoveringItem();
            await renderHeldItem();
        });
        matrices.view.push();
        matrices.view.translate(matrices.width / 2, offsetY, 0);
        matrices.view.scale(screenScale, screenScale, 1);
        matrices.view.rotate(Axis.Z_POS.rotateDeg(-4.74 - 30 * t));
        matrices.view.translate(300 * t, -1000 * t, 0);
        const { tex, width, height } = await getTextureByUri(photo_frame);
        draw.texture(
            -width / 2, -height / 2,
            width / 2, height / 2,
            tex,
        )
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw.texture(
            -width / 2, -height / 2,
            width / 2, height / 2,
            drawFrameBufferTexture,
        )
        const mousePos = matrices.unprojectPoint(mouse.gl).mul({
            x: 1,
            y: -1,
        }).add({
            x: width / 2,
            y: height / 2,
        });
        const lastPos = matrices.unprojectPoint(Vec2.from(mouse.gl).sub(mouse.deltaGl)).mul({
            x: 1,
            y: -1,
        }).add({
            x: width / 2,
            y: height / 2,
        });
        matrices.view.pop();
        drawFrameBufferTexture.use(() => {
            drawFrameBufferTexture.ensureSize(width, height);
        });
        const tool = photoMode.tool;
        if (tool.type !== 'move' && mouse.over && !mouse.ui) {
            const radius = tool.type === 'pen' ? photoMode.pen.width : photoMode.eraser.width;
            const cursor = matrices.unprojectPoint(mouse.gl);
            const penRadius = radius / 0.7 * scaleFactor;
            draw.circle(
                cursor.x,
                cursor.y,
                penRadius + 2,
                penRadius + 8,
                new Vec4(1, 1, 1, 1),
            );
            draw.circle(
                cursor.x,
                cursor.y,
                penRadius + 0,
                penRadius + 2,
                new Vec4(0, 0, 0, 1),
            );
        }
        if (client && tool.type !== 'move' && mouse.down && mouse.over && !mouse.ui) {
            let a: Vec2 = Vec2.ZERO;
            let b: Vec2 = Vec2.ZERO;
            let c: Vec2 = Vec2.ZERO;
            const distance = mousePos.sub(penTrail?.last ?? Vec2.ZERO).length();
            if (penTrail) {
                a = penTrail.last;
                b = penTrail.last.add(penTrail.dir.scale(0.25));
                c = mousePos;
            } else {
                a = lastPos;
                b = lastPos.lerp(mousePos, 0.5);
                c = mousePos;
            }
            penTrail = {
                last: mousePos,
                dir: Bezier.quadraticDerivative2(a, b, c, 0.5),
                time: penTrail?.time ?? Time.get(),
            };
            const newQueue: PaintEvent[] = [];
            if (distance > 0.5) {
                if (tool.type === 'eraser') {
                    newQueue.push({
                        t: PAINT_EVENT_TYPE.ERASER,
                        path: {
                            t: 'qb',
                            in: penTrail ? photoMode.eraser.width : 0,
                            out: photoMode.eraser.width,
                            a, b, c,
                        }
                    });
                } else {
                    newQueue.push({
                        t: PAINT_EVENT_TYPE.PEN,
                        path: {
                            t: 'qb',
                            in: penTrail ? photoMode.pen.width : 0,
                            out: photoMode.pen.width,
                            a, b, c,
                        }
                    });
                }
            }
            paintQueue.push(...newQueue);
        } else {
            penTrail = null;
        }
        processPaintQueue(width, height);
    }
}

export const paintQueue: PaintEvent[] = [];
export const paintTools = {
    pen: DEFAULT_PEN satisfies Pen,
    eraser: DEFAULT_ERASER satisfies Eraser,
}

function processPaintQueue(width: number, height: number) {
    if (paintQueue.length === 0) return;
    const queue: PaintEvent[] = [];
    const { paintSignal, paintEvents } = getGame();
    let clear = false;
    const { pen: newPen, eraser: newEraser } = context.config.photo_mode;
    if (newPen.width !== paintTools.pen.width || newPen.opacity !== paintTools.pen.opacity || !Vec4.from(newPen.color).equal(paintTools.pen.color)) {
        paintTools.pen = copy(newPen);
        paintQueue.push({
            t: 'cp',
            pen: newPen,
        });
    }
    if (newEraser.width !== paintTools.eraser.width || newEraser.opacity !== paintTools.eraser.opacity) {
        paintTools.eraser = copy(newEraser);
        paintQueue.push({
            t: 'ce',
            eraser: newEraser,
        });
    }
    let last: PaintEvent | null = null;
    for (const event of paintQueue) {
        if (last && last.t === PAINT_EVENT_TYPE.CHANGE_PEN && event.t === PAINT_EVENT_TYPE.CHANGE_PEN) {
            queue.pop();
            queue.push({
                t: PAINT_EVENT_TYPE.CHANGE_PEN,
                pen: event.pen,
            });
        } else if (last && last.t === PAINT_EVENT_TYPE.CHANGE_ERASER && event.t === PAINT_EVENT_TYPE.CHANGE_ERASER) {
            queue.pop();
            queue.push({
                t: PAINT_EVENT_TYPE.CHANGE_ERASER,
                eraser: event.eraser,
            });
        } else if (event.t === PAINT_EVENT_TYPE.CLEAR) {
            clear = true;
            queue.length = 0;
            queue.push(event);
            queue.push({
                t: PAINT_EVENT_TYPE.CHANGE_PEN,
                pen: paintTools.pen,
            });
            queue.push({
                t: PAINT_EVENT_TYPE.CHANGE_ERASER,
                eraser: paintTools.eraser,
            });
        } else if (event.t === PAINT_EVENT_TYPE.PEN || event.t === PAINT_EVENT_TYPE.ERASER) {
            queue.push(event);
        }
        last = event;
    }
    if (side === 'client') {
        paintEvents.update((buffer) => {
            if (clear) {
                buffer = PaintBuffer.NONE;
            }
            return buffer.push(...queue);
        });
        paintSignal.notify(queue);
    }
    const { gl } = glContext;
    matrices.scope(() => {
        matrices.view.identity();
        matrices.projection.identity();
        matrices.projection.orthographic(0, width, height, 0, -1, 1);
        drawFrameBuffer.use(() => {
            glContext.stateManager.pushViewport({ x: width, y: height });
            for (const event of queue) {
                if (event.t === PAINT_EVENT_TYPE.CHANGE_PEN) {
                    paintTools.pen = event.pen;
                } else if (event.t === PAINT_EVENT_TYPE.CHANGE_ERASER) {
                    paintTools.eraser = event.eraser;
                } else if (event.t === PAINT_EVENT_TYPE.PEN) {
                    const { path } = event;
                    const pen = paintTools.pen;
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    draw.bezierCurve(
                        path.a,
                        path.b,
                        path.c,
                        Vec4.from(pen.color).scale(1 / 255),
                        path.in,
                        path.out,
                    );
                } else if (event.t === PAINT_EVENT_TYPE.ERASER) {
                    const { path } = event;
                    gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
                    draw.bezierCurve(
                        path.a,
                        path.b,
                        path.c,
                        new Vec4(0, 0, 0, 1),
                        path.in,
                        path.out,
                    );
                    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                } else if (event.t === PAINT_EVENT_TYPE.CLEAR) {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
            }
            paintQueue.length = 0;
        });
    });
    glContext.stateManager.popViewport();
}

let penTrail: {
    last: Vec2,
    dir: Vec2,
    time: number,
} | null = null;

export async function renderBackgroundSide() {
    if (side !== 'background') return;

    setupBackgroundProjection();
    await renderBackground();
}

export async function renderClientSide() {
    if (side !== 'client') return;
    const { scene } = context;

    setupHUDProjection();
    await updateMouseClient();
    setupBackgroundProjection();
    await renderBackground();

    frameBufferTexture.use(() => {
        frameBufferTexture.ensureSize(matrices.width, matrices.height);
    });
    await frameBuffer.useAsync(async () => {
        glContext.gl.clear(glContext.gl.COLOR_BUFFER_BIT);
        glContext.gl.clearColor(1, 1, 1, 0);
        setupCounterProjection();
        await update();
        await renderCounter();
        await updateHoveringItem([ITEM_LAYERS.COUNTER, ITEM_LAYERS.KITCHEN_ITEMS, ITEM_LAYERS.BELL]);
        await renderItems([ITEM_LAYERS.COUNTER, ITEM_LAYERS.KITCHEN_ITEMS, ITEM_LAYERS.BELL]);
        if (scene.type !== 'photo_mode') {
            await renderHoveringItem();
            await renderHeldItem();
        }
        
        setupHUDProjection();
        await renderOverlay();
        setupCounterProjection();
        await renderParticles();
        await renderOverlay2();
    });

    setupHUDProjection();
    if (scene.type === 'photo_mode') {
        const t = getScreenTime(scene.time);
        matrices.view.scope(() => {
            matrices.view.translate(0, 50 * (1 - t), 0);
            draw.texture(
                0, matrices.height,
                matrices.width, 0,
                frameBufferTexture,
                new Vec4(1, 1, 1, t),
            );
        });
    } else {
        draw.texture(
            0, matrices.height,
            matrices.width, 0,
            frameBufferTexture,
        );
    }

    await renderScreen();
    await renderCursor();
    syncData();
}

export async function renderOverlaySide() {
    if (side !== 'overlay') {
        throw new Error('Overlay is not in overlay side');
    }
    const scene = context.scene;

    setupHUDProjection();
    updateMouseAsset();
    setupBackgroundProjection();
    await renderEffect();
    
    setupCounterProjection();

    frameBufferTexture.use(() => {
        frameBufferTexture.ensureSize(matrices.width, matrices.height);
    });
    await frameBuffer.useAsync(async () => {
        glContext.gl.clear(glContext.gl.COLOR_BUFFER_BIT);
        glContext.gl.clearColor(1, 1, 1, 0);
        await update();
        await renderCounter();
        await renderItems([ITEM_LAYERS.KITCHEN_ITEMS]);
        setupHUDProjection();
        await renderOverlay();
        setupCounterProjection();
        await renderHeldItem();
        await renderParticles();
        await renderItems([ITEM_LAYERS.COUNTER, ITEM_LAYERS.BELL]);
        setupHUDProjection();
        await renderOverlay2();
    });

    setupHUDProjection();
    if (scene.type === 'photo_mode') {
        const t = getScreenTime(scene.time);
        matrices.view.scope(() => {
            matrices.view.translate(0, 50 * (1 - t), 0);
            draw.texture(
                0, matrices.height,
                matrices.width, 0,
                frameBufferTexture,
                new Vec4(1, 1, 1, t),
            );
        });
    } else {
        draw.texture(
            0, matrices.height,
            matrices.width, 0,
            frameBufferTexture,
        );
    }

    await renderScreen();
    await renderCursor();
}

export async function render(gl: GlContext): Promise<void> {
    matrices.width = gl.gl.canvas.width;
    matrices.height = gl.gl.canvas.height;
    let resolved = () => {};
    renderLock = new Promise<void>(resolve => {
        resolved = resolve;
    });
    const { gl: glInternal } = gl;
    glContext.stateManager.setViewport({ x: glInternal.canvas.width, y: glInternal.canvas.height });
    glInternal.clearColor(1, 1, 1, 0);
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

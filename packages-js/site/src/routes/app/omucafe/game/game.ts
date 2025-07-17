import { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { Matrices } from '$lib/components/canvas/matrices.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2, type Vec2Like } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { getTextureByAsset, getTextureByUri, getTextureByUriCORS, uploadAssetByBlob } from '../asset/asset.js';
import bell from '../images/bell.png';
import counter_client from '../images/counter_client.png';
import { createContainer } from '../item/behaviors/container.js';
import { createItemState, getItemStateRender, ITEM_LAYERS, loadBehaviorHandlers, markItemStateChanged, renderHeldItem, renderHoveringItem, renderItems, renderItemState, retrieveClickActions, updateHoveringItem } from '../item/item-state.js';
import { createItem } from '../item/item.js';
import type { KitchenContext } from '../kitchen/kitchen.js';

export const COUNTER_WIDTH = 1920 * 2;
export const COUNTER_HEIGHT = 500;
export const UPDATE_RATE = 60;
export let lastUpdate = Time.now();
export let changed = false;
export let glContext: GlContext;
export let matrices: Matrices;
export let canvas: HTMLCanvasElement;
export let scaleFactor = 1;
export let draw: Draw;
let frameBuffer: GlFramebuffer;
let frameBufferTexture: GlTexture;

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

async function processClick() {
    const action = await retrieveClickActions();
    if (!action) return;
    await action.callback();
}

async function handleMouseDown() {
    const { hovering, scene, config } = context;
    if (context.held) {
        if (scene.type === 'product_take_photo' && hovering === 'counter') {
            const product = config.products[scene.id];
            const heldItem = context.items[context.held];
            const { texture } = await getItemStateRender(heldItem);
            await readBuffer.useAsync(async () => {
                readBuffer.attachTexture(texture);
                const blob = await readBuffer.readAs(0, 0, texture.width, texture.height);
                product.image = await uploadAssetByBlob(blob);
            });
            getGame().scene.set({
                type: 'product_edit',
                id: scene.id,
            });
            context.held = null;
        }
    }
    await processClick();
}

async function handleMouseUp() {
}

function syncData() {
    if (!changed) return;
    const time = Time.now();
    const delta = time - lastUpdate;
    if (delta < 1000 / UPDATE_RATE) {
        return;
    }
    changed = false;
    lastUpdate = time;
    const { states } = getGame();
    states.set({
        ...context.states,
        kitchen: {
            audios: context.audios,
            items: context.items,
            held: context.held,
            hovering: context.hovering,
            order: context.order,
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

export const mouse: Mouse = Mouse.create();

export let paint: Paint;
export let resources: Resources;
let readBuffer: GlFramebuffer;

export async function init(ctx: GlContext) {
    const { paintSignal, paintEvents, gameConfig } = getGame();
    glContext = ctx;
    matrices = new Matrices();
    matrices.width = ctx.gl.canvas.width;
    matrices.height = ctx.gl.canvas.height;
    draw = new Draw(matrices, ctx);
    frameBufferTexture = ctx.createTexture();
    frameBufferTexture.use(() => {
        frameBufferTexture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
    });
    frameBuffer = ctx.createFramebuffer();
    frameBuffer.use(() => {
        frameBuffer.attachTexture(frameBufferTexture);
    });
    readBuffer = ctx.createFramebuffer();
    resources = await getResources();
    paint = new Paint(ctx, resources.photo_frame);
    if (side !== 'client') {
        paintSignal.listen((events) => {
            paint.emit(...events);
        });
    }
    await once((resolve) => paintEvents.subscribe((buffer) => {
        paint.emit(...buffer.read());
        resolve();
    }));
    await once((resolve) => gameConfig.subscribe((gameConfig) => {
        paint.emit({
            t: PAINT_EVENT_TYPE.CHANGE_PEN,
            pen: gameConfig.photo_mode.pen,
        }, {
            t: PAINT_EVENT_TYPE.CHANGE_ERASER,
            eraser: gameConfig.photo_mode.eraser,
        });
        resolve();
    }));
        
    await loadBehaviorHandlers();
    await createAudioContext();
    if (side === 'client') {
        const counterTex = await getTextureByUri(counter_client);
        const existCounter = context.items['counter'];
        const counterItem = createItem({
            id: 'counter',
            name: 'カウンター',
            image: {
                type: 'url',
                url: counter_client,
            },
            bounds: {
                min: Vec2.ZERO,
                max: { x: counterTex.width, y: counterTex.height },
            },
            behaviors: {
                container: createContainer({bounded: {
                    left: true,
                    right: true,
                    bottom: true,
                    top: false,
                }}),
            },
            transform: {
                right: Vec2.RIGHT,
                up: Vec2.UP,
                offset: { x: 0, y: 0 },
            },
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
                { x: 50, y: -100 },
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

function setupCustomerProjection() {
    const { gl } = glContext;

    matrices.projection.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
    matrices.view.identity();
    matrices.view.scale(scaleFactor, scaleFactor, 1);
}

export function applyDragEffect() {
    matrices.model.multiply(new Mat4(
        1, -mouse.delta.y / 1000, 0, 0,
        -mouse.delta.x / 1000, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ));
    const elapsed = (Time.now() - Math.max(mouse.downTime, mouse.upTime)) / 1000;
    const scale = 1 + Math.sin(elapsed * BetterMath.TAU * 3) / (elapsed * elapsed * 200 + 1) * 0.05;
    matrices.model.scale(scale, scale, 1);
}

async function renderCounter() {
    const kitchenTex = side === 'client' ? resources.kitchen_client : resources.kitchen_asset;
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
    for (const event of mouse.iterate()) {
        if (event.type === 'down') {
            await handleMouseDown();
        }
        else if (event.type === 'up') {
            await handleMouseUp();
        }
        markChanged();
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
    context.mouse = mouse;
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
        await updateAudioClips();
    }
}

import { once } from '$lib/helper.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Axis } from '$lib/math/axis.js';
import { Bezier } from '$lib/math/bezier.js';
import { createAudioContext, updateAudioClips } from '../asset/audioclip.js';
import { createAction } from '../item/behaviors/action.js';
import { renderBackground, renderEffect, renderOverlay, renderOverlay2 } from './renderer/background.js';
import { renderCursor } from './renderer/cursor.js';
import { Time } from './time.js';

function getScreenTime(time: number) {
    const elapsed = Time.now() - time;
    const t = 1 / Math.pow(elapsed / 250 + 1, 3);
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
        matrices.view.scale(scaleFactor, scaleFactor, 1);
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
    } else if (scene.type === 'effect_edit') {
        draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(1, 1, 1, 0.5));
        matrices.view.push();
        matrices.view.translate(width / 2, height / 2, 0);
        matrices.view.scale(scaleFactor, scaleFactor, 1);
        const { id, time } = scene;
        const elapsed = Time.now() - time;
        const effect = context.config.effects[id];
        const { particle } = effect.attributes;
        if (particle) {
            const bounds = AABB2.from({
                min: { x: -100, y: -100 },
                max: { x: 100, y: 100 },
            });
            draw.rectangleStroke(
                bounds.min.x, bounds.min.y,
                bounds.max.x, bounds.max.y,
                new Vec4(0, 0, 0, 0.5), 2,
            )
            await renderParticles(particle, {
                seed: effect.id,
                bounds,
                time: elapsed,
            });
        }
        matrices.view.pop();
    } else if (scene.type === 'photo_mode') {
        const { photoTake } = scene;
        await renderPhotoScreen(scene, gl);
        matrices.view.push();
        matrices.view.translate(matrices.width / 2, matrices.height / 2, 0);
        matrices.view.scale(scaleFactor, scaleFactor, 0);
        const center = new Vec2(0, 0);
        draw.fontFamily = 'Note Sans JP';
        draw.fontSize = 200;
        const TIME_MARGIN = 100;
        if (photoTake?.type === 'countdown') {
            const { startTime, duration } = photoTake;
            const target = startTime + duration;
            const opacity = 1 - invLerp(startTime, startTime + duration - TIME_MARGIN, Time.now());
            const remaining = Math.floor(Math.max(0, target - Time.now()) / 1000) + 1;
            await draw.textAlign(center, remaining.toString(), Vec2.CENTER, new Vec4(0, 0, 0, opacity));
        } else if (photoTake?.type === 'taken') {
            const { time, asset } = photoTake;
            const offset = 200;
            const elapsed = Time.now() - time - offset;
            const { tex, width, height } = await getTextureByAsset(asset);
            const t = 1 - 1 / (elapsed / 200 + 1);
            matrices.view.push();
            matrices.view.identity();
            draw.rectangle(
                0, 0,
                matrices.width, matrices.height,
                new Vec4(1, 1, 1, Math.min(0, 1 - t * 2)),
            );
            matrices.view.translate(matrices.width / 2, matrices.height / 2, 0);
            matrices.model.push();
            const scale = lerp(1.1, 1, t);
            matrices.model.scale(scale, scale, 1);
            const fitScale = Math.max(matrices.width / width, matrices.height / height);
            matrices.view.scale(fitScale, fitScale, 1);
            draw.texture(
                -width / 2,
                -height / 2,
                width / 2,
                height / 2,
                tex,
                new Vec4(1, 1, 1, Math.min(1, t * 2)),
            );
            matrices.model.pop();
            matrices.view.pop();
        }
        matrices.view.pop();
    }
}

let penTrail: {
    last: Vec2,
    dir: Vec2,
    time: number,
} | null = null;

async function renderPhotoScreen(scene: SceneType<'photo_mode'>, gl: WebGL2RenderingContext) {
    const t = getScreenTime(scene.time);
    const photoMode = context.config.photo_mode;
    const client = side === 'client';
    const screenScale = client ? scaleFactor * 0.7 * 2 : scaleFactor * 2;
    const offsetY = client ? matrices.height / 2 - matrices.height * 0.07 - 50 : matrices.height / 2;
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (t < 0.5 && !client) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
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
    const { tex, width, height } = resources.photo_frame;
    draw.texture(
        -width / 2, -height / 2,
        width / 2, height / 2,
        tex
    );
    draw.texture(
        -width / 2, -height / 2,
        width / 2, height / 2,
        paint.texture
    );
    draw.fontFamily = 'Note Sans JP';
    draw.fontSize = 26;
    const dateText = new Date(scene.time).toLocaleString();
    const dateMetrics = draw.measureTextActual(dateText);
    const dateDimentions = dateMetrics.dimensions();
    await draw.text(width / 2 - dateDimentions.x - 140, height / 2 - dateDimentions.y - 120, dateText, new Vec4(0, 0, 0, 0.5));
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
    if (scene.photoTake) return;

    const tool = photoMode.tool;
    if (client && tool.type !== 'move' && mouse.over && !mouse.ui) {
        const radius = tool.type === 'pen' ? photoMode.pen.width : photoMode.eraser.width;
        const cursor = matrices.unprojectPoint(mouse.gl);
        const penRadius = radius / 0.7 * scaleFactor * 2;
        draw.circle(
            cursor.x,
            cursor.y,
            penRadius + 2,
            penRadius + 8,
            new Vec4(1, 1, 1, 1)
        );
        draw.circle(
            cursor.x,
            cursor.y,
            penRadius + 0,
            penRadius + 2,
            new Vec4(0, 0, 0, 1)
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
            time: penTrail?.time ?? Time.now(),
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
        paint.emit(...newQueue);
    } else {
        penTrail = null;
    }
    paint.update(width, height);
        
    const { order } = context;
    if (order && order.message) {
        matrices.view.push();
        matrices.view.scale(scaleFactor, scaleFactor, 1);
        await renderMessage(order.message, new Vec2(3600, 1400), 0);
        matrices.view.pop();
    }
}

export async function renderBackgroundSide() {
    if (side !== 'background') return;

    setupBackgroundProjection();
    await renderBackground();
}

import { BetterMath } from '$lib/math.js';
import { invLerp, lerp } from '$lib/math/math.js';
import dummy_back from '../images/dummy_back.png';
import dummy_front from '../images/dummy_front.png';
import { getGame, type User } from '../omucafe-app.js';
import { isNounLike, type OrderMessage } from '../order/order.js';
import type { SceneType } from '../scenes/scene.js';
import { Mouse } from './mouse.js';
import { Paint, PAINT_EVENT_TYPE, type PaintEvent } from './paint.js';
import { renderParticles } from './renderer/particle.js';
import { getResources, type Resources } from './resources.js';

async function renderNametag(user: User, bounds: AABB2) {
    const dimentions = bounds.dimensions();
    // draw.rectangle(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, new Vec4(0.99, 0.99, 0.99, 1));
    const strokeOffset = 2;
    const size = dimentions.x / 6;
    // draw.rectangleStroke(bounds.min.x + strokeOffset, bounds.min.y + strokeOffset, bounds.max.x - strokeOffset, bounds.max.y - strokeOffset, new Vec4(0, 0, 0, 0.5), 3);
    if (user.avatar) {
        const { tex } = await getTextureByUriCORS(user.avatar);
        const x = bounds.min.x + size / 2 + strokeOffset;
        const y = bounds.min.y + dimentions.y / 2 - size / 2;
        draw.texture(x, y, x + size, y + size, tex);
    }
    draw.fontFamily = '\'Noto Sans JP\', sans-serif';
    draw.fontSize = size / 1.5;
    const textAnchor: Vec2Like = { x: bounds.min.x + size * 2 + strokeOffset, y: bounds.min.y + dimentions.y / 2 }
    await draw.textAlign(textAnchor, user.name, Vec2.UP, new Vec4(0, 0, 0, 1));
    if (user.screen_id) {
        draw.fontSize = size / 2;
        await draw.textAlign(textAnchor, user.screen_id, Vec2.ZERO, new Vec4(0, 0, 0, 0.5));
    }
}

async function renderCustomersClient(position: Vec2) {
    const { order } = context;
    if (order) {
        const { user, message } = order;
        const { tex, width, height } = await getTextureByUri(side === 'client' ? dummy_front : dummy_back);
        draw.texture(position.x, position.y, position.x + width / 1.2, position.y + height / 1.2, tex);
        const nametagBounds = AABB2.from({
            min: {x: -340, y: -200},
            max: {x: 340, y: 200},
        })
            .scale(side === 'client' ? 0.6 : 0.7)
            .offset({ x: width / 1.2 / 2, y: height / 1.2 / 2 })
            .offset(position);
        await renderNametag(user, nametagBounds);
        if (message) {
            await renderMessage(message, position, 600);
        }
    }
}

async function renderMessage(message: OrderMessage, anchor: Vec2, maxWidth: number) {
    const { tokens, timestamp } = message;
    const elapsed = (Time.now() - timestamp) / 200;
    const t = Math.cos(elapsed * Math.sqrt(elapsed)) / (10 * elapsed * elapsed + 1);
    anchor = anchor.add({
        x: maxWidth / 1.2 / 2,
        y: 100 + 80 * (t),
    });
    const height = 60;
    draw.fontFamily = 'Noto Sans JP';
    draw.fontSize = 30;
    const hasNoun = tokens.some(token => isNounLike(token));
    const textWidth = tokens.reduce((sum, token) => {
        const isNounToken = !hasNoun || isNounLike(token);
        draw.fontSize = isNounToken ? 50 : 40;
        const metrics = draw.measureText(token.surface_form);
        return sum + (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) + (isNounToken ? 10 : 0);
    }, 0);
    anchor = anchor.add({ x: -textWidth + Math.min(maxWidth, textWidth / 2), y: 0 });
    const padding = 20;
    draw.rectangle(
        anchor.x - padding, anchor.y - padding,
        anchor.x + textWidth + padding, anchor.y + height + padding,
        new Vec4(1, 1, 1, 1)
    );
    let x = 0;
    for (const token of tokens) {
        const isNounToken = !hasNoun || isNounLike(token);
        draw.fontSize = isNounToken ? 50 : 40;
        const text = token.surface_form;
        const metrics = draw.measureText(text);
        const baseline = height - metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent;
        await draw.text(anchor.x + x + (isNounToken ? 5 : 0), anchor.y + baseline, text, new Vec4(0, 0, 0, isNounToken ? 1 : 0.5));
        x += (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) + (isNounToken ? 10 : 0);
    }
}

async function renderCustomersAsset(position: Vec2) {
    const { order } = context;
    if (order) {
        const { user } = order;
        const { tex, width, height } = await getTextureByUri(side === 'client' ? dummy_front : dummy_back);
        draw.texture(position.x, position.y, position.x + width / 1.2, position.y + height / 1.2, tex);
        const center = position.add({x: width / 1.2 / 2, y: height / 1.2 / 2});
        draw.fontFamily = 'Noto Sans JP, sans-serif';
        draw.fontSize = 40;
        await draw.textAlign(center, user.name, {x: 0.5, y: 0}, new Vec4(0, 0, 0, 0.5));
    }
}

export async function renderClientSide() {
    if (side !== 'client') return;
    const { scene, items } = context;
    const { gl } = glContext;

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
        setupCustomerProjection();
        await renderCustomersClient(new Vec2(1920 * 2 - 1200, 80));

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
        await renderOverlay2();
    });

    setupHUDProjection();
    if (scene.type === 'kitchen' && scene.transition) {
        const t = 1 - getScreenTime(scene.transition.time);
        matrices.view.scope(() => {
            matrices.view.translate(0, 50 * (1 - t), 0);
            draw.texture(
                0, matrices.height,
                matrices.width, 0,
                frameBufferTexture,
                new Vec4(1, 1, 1, t),
            );
        });
    } else if (scene.type !== 'photo_mode') {
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
    const { gl } = glContext;

    setupHUDProjection();
    updateMouseAsset();
    setupBackgroundProjection();
    await renderEffect();
    setupCounterProjection();

    frameBufferTexture.use(() => {
        frameBufferTexture.ensureSize(matrices.width, matrices.height);
    });
    await frameBuffer.useAsync(async () => {
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        
        await update();
        await renderCounter();
        await renderItems([ITEM_LAYERS.KITCHEN_ITEMS]);
        setupHUDProjection();
        await renderOverlay();
        setupCounterProjection();
        await renderItems([ITEM_LAYERS.COUNTER, ITEM_LAYERS.BELL]);
        await renderHeldItem();
    
        setupCustomerProjection();
        await renderCustomersAsset(new Vec2(1920 * 2 - 1200, 1200));
        setupHUDProjection();
        await renderOverlay2();
    });

    setupHUDProjection();
    if (scene.type === 'photo_mode') {
        const t = getScreenTime(scene.time);
        if (t > 0.1) {
            matrices.view.scope(() => {
                matrices.view.translate(0, 50 * (1 - t), 0);
                gl.disable(gl.BLEND);
                draw.texture(
                    0, matrices.height,
                    matrices.width, 0,
                    frameBufferTexture,
                    new Vec4(1, 1, 1, t),
                );
                gl.enable(gl.BLEND);
            });
        }
    } else if (scene.type === 'kitchen' && scene.transition) {
        const t = 1 - getScreenTime(scene.transition.time);
        matrices.view.scope(() => {
            matrices.view.translate(0, 50 * (1 - t), 0);
            gl.disable(gl.BLEND);
            draw.texture(
                0, matrices.height,
                matrices.width, 0,
                frameBufferTexture,
                new Vec4(1, 1, 1, t),
            );
            gl.enable(gl.BLEND);
        });
    } else {
        gl.disable(gl.BLEND);
        draw.texture(
            0, matrices.height,
            matrices.width, 0,
            frameBufferTexture,
        );
        gl.enable(gl.BLEND);
    }

    await renderScreen();
    await renderCursor();
}

export async function render(ctx: GlContext): Promise<void> {
    matrices.width = ctx.gl.canvas.width;
    matrices.height = ctx.gl.canvas.height;
    let resolveLock = () => {};
    renderLock = new Promise<void>(resolve => {
        resolveLock = resolve;
    });
    const { gl } = ctx;
    glContext.stateManager.setViewport({ x: matrices.width, y: matrices.height });
    gl.enable(gl.BLEND);
    gl.clearColor(1, 1, 1, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    const rect = {
        width: matrices.width,
        height: matrices.height,
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
    resolveLock();
}

import { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext } from '$lib/components/canvas/glcontext.js';
import { Matrices } from '$lib/components/canvas/matrices.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import counter from '../images/counter.png';
import kitchen from '../images/kitchen.png';
import { fetchAudio, getAsset, getTextureByAsset, getTextureByUri } from './asset.js';
import { createContainer } from './behavior/container.js';
import { createFixed } from './behavior/fixed.js';
import { createItemState, getItemStateTransform, invokeBehaviors, loadBehaviorHandlers, renderHeldItem, renderHoveringItem, renderItems, renderItemState, updateHoveringItem, type ItemState } from './item-state.js';
import { createItem } from './item.js';
import type { KitchenContext } from './kitchen.js';

export const COUNTER_WIDTH = 1920;
export const COUNTER_HEIGHT = 500;
export const UPDATE_RATE = 60;
export let lastUpdate = performance.now();
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
export let context: KitchenContext;
export function setContext(ctx: KitchenContext) {
    side = ctx.side;
    context = ctx;
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

function syncData() {
    if (!changed) return;
    changed = false;
    const time = performance.now();
    const delta = time - lastUpdate;
    if (delta < 1000 / UPDATE_RATE) {
        return;
    }
    lastUpdate = time;
    const states = context.getStates();
    context.setStates({
        ...states,
        kitchen: {
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

function registerMouseEvents() {
    window.addEventListener('mousemove', (e) => {
        mouse.client = new Vec2(e.clientX, e.clientY);
        mouse.over = true;
        markChanged();
    });
    window.addEventListener('mousedown', () => {
        mouse.down = true;
        mouse.downTime = performance.now();
        handleMouseDown();
    });
    window.addEventListener('mouseup', () => {
        mouse.down = false;
        mouse.upTime = performance.now();
        handleMouseUp();
    });
    window.addEventListener('mouseout', () => {
        mouse.over = false;
    });
    window.addEventListener('mouseenter', () => {
        mouse.over = true;
    });
    window.addEventListener('mouseleave', () => {
        mouse.over = false;
    });
}

export async function init(ctx: GlContext) {
    glContext = ctx;
    registerMouseEvents();
    matrices = new Matrices();
    draw = new Draw(matrices, ctx);
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
                max: { x: counterTex.width, y: counterTex.height },
            },
            behaviors: {
                fixed: createFixed(),
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
            item,
            children: existCounter?.children,
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


import { transformToMatrix } from './transform.js';

async function updateMouse() {
    if (side !== 'client') return;
    const { gl } = glContext;
    const scene = context.getScene();
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
const audioCache: Map<string, HTMLAudioElement> = new Map();
async function updateEffects() {
    const newAudios: Map<string, HTMLAudioElement> = new Map();
    for (const item of Object.values(context.items)) {
        for (const effect of Object.values(item.effects)) {
            const { audio, particle } = effect.attributes;
            if (audio) {
                const { asset, volume } = audio;
                const audioResource = await getAsset(asset).then(fetchAudio);
                audioResource.volume = volume;
                newAudios.set(item.id, audioResource);
            }
            if (particle) {
                const { asset } = particle;
                const tex = await getTextureByAsset(asset);
                const effect = particleCache.get(item.id) ?? {
                    particles: [],
                    animate: (particle) => {
                        const { vx, vy } = particle;
                        particle.x += vx;
                        particle.y += vy;
                        particle.vy += 0.2;
                        particle.life -= 1;
                    },
                    tex: tex,
                    lastSpawn: performance.now(),
                };
                const speed = 2;
                const life = 20;
                const maxCount = 30;
                const remaining = maxCount - effect.particles.length;
                const elapsed = performance.now() - effect.lastSpawn;
                const transform = getItemStateTransform(item);
                const bounds = item.bounds;
                const renderBounds = new AABB2(
                    transform.transform2(bounds.min),
                    transform.transform2(bounds.max),
                )
                
                const count = Math.min(remaining, elapsed / life * maxCount / 100);
                for (let i = 0; i < Math.floor(count); i++) {
                    effect.lastSpawn = performance.now();
                    const pos = renderBounds.at({x: Math.random(), y: Math.random()});
                    effect.particles.push({
                        x: pos.x,
                        y: pos.y,
                        vx: Math.random() * speed - speed / 2,
                        vy: -speed,
                        life: life,
                        maxLife: life,
                    });
                }
                particleCache.set(item.id, effect);
            }
        }
    }
    for (const [id, audio] of audioCache) {
        if (!newAudios.has(id)) {
            audio.pause();
            audioCache.delete(id);
        }
    }
    for (const [id, audio] of newAudios) {
        if (!audioCache.has(id)) {
            audio.currentTime = 0;
            audio.play();
            audioCache.set(id, audio);
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

import { AABB2 } from '$lib/math/aabb2.js';
import { renderBackground, renderEffect, renderOverlay, renderOverlay2 } from './renderer/background.js';
import { renderCursor } from './renderer/cursor.js';
import { particleCache, renderParticles } from './renderer/particle.js';

async function renderScreen() {
    const { gl } = glContext;
    const { width, height } = gl.canvas;
    const scene = context.getScene();
    if (scene.type === 'item_edit') {
        draw.rectangle(0, 0, gl.canvas.width, gl.canvas.height, new Vec4(1, 1, 1, 0.5));
        matrices.view.push();
        matrices.view.translate(width / 2, height / 2, 0);
        const ingredient = context.getConfig().items[scene.id];
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

export async function render(gl: GlContext) {
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
            await renderItemState(context.items['counter']);
        }
    }
    
    setupHUDProjection();
    if (side !== 'background') {
        await renderOverlay();
        setupCounterProjection();
        if (context.items['counter']) {
            await renderItemState(context.items['counter']);
        }
        if (side === 'client') {
            await renderHoveringItem();
        }
        await renderHeldItem();
        await renderParticles();
        setupHUDProjection();
        await renderOverlay2();
    }

    await renderScreen();
    await renderCursor();
    if (side === 'client') {
        syncData();
    }
}

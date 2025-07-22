import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { comparator } from '$lib/helper.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { invLerp, lerp } from '$lib/math/math.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { getTextureByAsset } from '../asset/asset.js';
import { applyDragEffect, draw, getContext, glContext, matrices, mouse } from '../game/game.js';
import { copy, uniqueId } from '../game/helper.js';
import { Time } from '../game/time.js';
import { transformToMatrix, type Bounds, type Transform } from '../game/transform.js';
import { type BehaviorFunction, type BehaviorHandler, type BehaviorHandlers, type Behaviors, type ClickAction } from './behavior.js';
import type { Item } from './item.js';


export const ITEM_LAYERS = {
    PHOTO_MODE: 'photo_mode',
    KITCHEN_ITEMS: 'kitchen_items',
    BELL: 'bell',
    COUNTER: 'counter',
    EDIT_PREVIEW: 'edit_preview',
} as const;
export type ItemLayer = typeof ITEM_LAYERS[keyof typeof ITEM_LAYERS];
export const ITEM_LAYERS_LIST: ItemLayer[] = Object.values(ITEM_LAYERS);

export type ItemState = {
    id: string,
    item: Item,
    behaviors: Partial<Behaviors>,
    layer: ItemLayer,
    transform: Transform,
    children: string[],
    parent?: string,
    bounds: Bounds,
    update: number,
};

export function createItemState(options: {
    id?: string,
    item: Item,
    layer?: ItemLayer,
    transform?: Transform,
    children?: string[],
    behaviors?: Partial<Behaviors>,
    bounds?: Bounds,
}): ItemState {
    const { items } = getContext();
    const { id, item, layer, transform, children, behaviors, bounds } = options;
    const itemState = {
        id: id ?? uniqueId(),
        item: copy(item),
        layer: layer ?? ITEM_LAYERS.KITCHEN_ITEMS,
        transform: transform ?? copy(item.transform),
        children: children ?? [],
        behaviors: behaviors ?? copy(item.behaviors),
        bounds: bounds ?? copy(item.bounds),
        update: 0,
    } satisfies ItemState;
    items[itemState.id] = itemState;
    return itemState;
}

export function cloneItemState(itemState: ItemState, options: {
    layer?: ItemLayer,
    transform?: Transform,
    child?: boolean,
} = {}): ItemState {
    const { items } = getContext();
    
    let newTransform = itemState.transform;
    if (itemState.parent && !options.child) {
        const parent = items[itemState.parent];
        const parentTransform = calculateItemStateRenderTransform(parent);
        const itemTransform = transformToMatrix(itemState.transform);
        const newMatrix = parentTransform.multiply(itemTransform);
        newTransform = {
            right: {x: newMatrix.m00, y: newMatrix.m01},
            up: {x: newMatrix.m10, y: newMatrix.m11},
            offset: {x: newMatrix.m30, y: newMatrix.m31},
        };
    }
    const item = createItemState({
        id: uniqueId(),
        item: itemState.item,
        layer: options.layer ?? itemState.layer,
        transform: options.transform ?? newTransform,
        children: [],
        behaviors: copy(itemState.behaviors),
        bounds: copy(itemState.bounds),
    });
    items[item.id] = item;
    for (const childId of itemState.children) {
        const child = items[childId];
        if (!child) continue;
        const childClone = cloneItemState(child, {
            layer: item.layer,
            child: true,
        });
        childClone.parent = item.id;
        item.children.push(childClone.id);
    }
    return item;
}

export function removeItemState(itemState: ItemState) {
    const { items } = getContext();
    if (itemState.parent) {
        detachChildren(items[itemState.parent], itemState);
    }
    for (const childId of itemState.children) {
        const child = items[childId];
        if (!child) continue;
        removeItemState(child);
    }
    delete items[itemState.id];
    const existRender = itemRenderMap.get(itemState.id);
    if (!existRender) return;
    existRender.texture.delete();
    itemRenderMap.delete(itemState.id);
}

export function getParents(item: ItemState): ItemState[] {
    const ctx = getContext();
    const parents: ItemState[] = [];
    let parent: string | undefined = item.parent;
    while (parent) {
        const parentItem = ctx.items[parent];
        if (!parentItem) break;
        if (parents.includes(parentItem)) {
            throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${parent}`);
        }
        parents.push(parentItem);
        parent = parentItem.parent;
    }
    return parents;
}

export function retrieveAllChildItems(item: ItemState, children?: ItemState[]): ItemState[] {
    if (!children) {
        children = [];
    }
    const { items } = getContext();
    for (const childId of item.children) {
        const child = items[childId];
        if (!child) continue;
        children.push(child);
        retrieveAllChildItems(child, children);
    }
    return children;
}

export function attachChild(item: ItemState, child: ItemState) {
    if (item.id === child.id) {
        throw new Error('Cannot attach an item to itself');
    }
    if (child.parent) {
        detachChildren(getContext().items[child.parent], child);
    }
    const parents = getParents(item);
    if (parents.includes(child)) {
        throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${child.id}`);
    }
    const containerTransform = calculateItemStateRenderTransform(item);
    const childTransform = transformToMatrix(child.transform);
    const inverse = containerTransform.inverse();
    const newMatrix = inverse.multiply(childTransform);
    child.transform = {
        right: { x: newMatrix.m00, y: newMatrix.m01 },
        up: { x: newMatrix.m10, y: newMatrix.m11 },
        offset: { x: newMatrix.m30, y: newMatrix.m31 },
    };
    item.children.push(child.id);
    child.parent = item.id;
    markItemStateChanged(item);
}

let behaviorHandlers: BehaviorHandlers | undefined = undefined;

export async function loadBehaviorHandlers() {
    const { getBehaviorHandlers } = await import('./behavior.js');
    behaviorHandlers = await getBehaviorHandlers();
}

export async function invokeBehaviors<T extends keyof Behaviors, U>(
    item: ItemState,
    getMethod: (handler: BehaviorHandler<T>) => BehaviorFunction<T, U> | undefined,
    args: U,
): Promise<U> {
    const context = getContext();
    if (!behaviorHandlers) {
        throw new Error('Behavior handlers not loaded');
    }
    for (const key in behaviorHandlers) {
        const behavior = item.behaviors[key as keyof Behaviors] as Behaviors[T];
        const handler = behaviorHandlers![key as keyof Behaviors] as BehaviorHandlers[T];
        if (behavior && handler) {
            const method = getMethod(handler)?.bind(handler);
            if (method) {
                await method({ item, behavior, context }, args);
            }
        }
    }
    return args;
}

export function attachChildren(item: ItemState, ...children: ItemState[]) {
    children.forEach(child => {
        if (child.parent) {
            detachChildren(getContext().items[child.parent], child);
        }
        const containerTransform = calculateItemStateRenderTransform(item);
        const childTransform = transformToMatrix(child.transform);
        const inverse = containerTransform.inverse();
        const newMatrix = inverse.multiply(childTransform);
        child.transform = {
            right: { x: newMatrix.m00, y: newMatrix.m01 },
            up: { x: newMatrix.m10, y: newMatrix.m11 },
            offset: { x: newMatrix.m30, y: newMatrix.m31 },
        };
        const parents = getParents(item);
        if (parents.includes(child)) {
            throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${child.id}`);
        }
        item.children.push(child.id);
        child.parent = item.id;
    });
    markItemStateChanged(item);
}

export function detachChildren(item: ItemState, ...children: ItemState[]) {
    item.children = item.children.filter(childId => !children.some(child => child.id === childId));
    children.forEach(child => {
        if (child.parent) {
            const containerTransform = calculateItemStateRenderTransform(item);
            const heldTransform = transformToMatrix(child.transform);
            const newMatrix = containerTransform.multiply(heldTransform);
            child.transform = {
                right: {x: newMatrix.m00, y: newMatrix.m01},
                up: {x: newMatrix.m10, y: newMatrix.m11},
                offset: {x: newMatrix.m30, y: newMatrix.m31},
            };
        }
        child.parent = undefined;
    });
    markItemStateChanged(item);
}

const previousTransforms = new Map<string, Mat4>();

export function calculateItemStateRenderTransform(itemState: ItemState): Mat4 {
    const ctx = getContext();
    const parents = getParents(itemState);
    const rootItem = parents[parents.length - 1] || itemState;
    parents.reverse();
    
    let transform = Mat4.IDENTITY;
    const isAssetSide = ctx.side === 'overlay';
    for (const item of [...parents, itemState]) {
        const flipY = item.layer !== ITEM_LAYERS.PHOTO_MODE && isAssetSide && !item.parent;
        const matrix = transformToMatrix(item.transform);
        if (flipY) {
            if (item.id === 'counter') {
                const z = matrix.m31 + item.bounds.max.y + 1080;
                transform = new Mat4(
                    matrix.m00, matrix.m01, matrix.m02, matrix.m03,
                    matrix.m10, matrix.m11, matrix.m12, matrix.m13,
                    matrix.m20, matrix.m21, matrix.m22, matrix.m23,
                    matrix.m30, 5000 / z * 260 - 260, matrix.m32, matrix.m33,
                );
            }
        }
        transform = transform.multiply(matrix);
    }
    const flipY = rootItem.layer !== ITEM_LAYERS.PHOTO_MODE && isAssetSide && !rootItem.parent;
    if (flipY) {
        if (rootItem.id === 'bell') {
            transform = new Mat4(
                transform.m00, transform.m01, transform.m02, transform.m03,
                transform.m10, transform.m11, transform.m12, transform.m13,
                transform.m20, transform.m21, transform.m22, transform.m23,
                transform.m30, 1080 - 440, transform.m32, transform.m33,
            );
        } else if (rootItem.id !== 'counter') {
            const bounds = getRenderBounds(itemState);
            const height = 1080;
            const scaleY = 0.7;
            const z = invLerp(120, height, lerp(bounds.min.y, bounds.max.y, 0.5));
            const weightedZ = z;
            transform = new Mat4(
                transform.m00 * 0.8, transform.m01, transform.m02, transform.m03,
                transform.m10, transform.m11 * scaleY, transform.m12, transform.m13,
                transform.m20, transform.m21, transform.m22, transform.m23,
                transform.m30, lerp(height - 100, 360, weightedZ) - (bounds.max.y - bounds.min.y) * scaleY, transform.m32, transform.m33,
            );
            // const bounds = getRenderBounds(itemState);
            // const height = 1080;
            // const scaleY = 0.7;
            // const z = invLerp(120, height, lerp(bounds.min.y, bounds.max.y, 1 - scaleY));
            // transform = new Mat4(
            //     transform.m00 * 0.8, transform.m01, transform.m02, transform.m03,
            //     transform.m10, transform.m11 * scaleY, transform.m12, transform.m13,
            //     transform.m20, transform.m21, transform.m22, transform.m23,
            //     transform.m30, lerp(120, height, z), transform.m32, transform.m33,
            // );
        }
    }

    if (isAssetSide) {
        const previous = previousTransforms.get(itemState.id) ?? transform;
        transform = previous.lerp(transform, 0.8);
        previousTransforms.set(itemState.id, transform);
    }
    return transform;
}

function calculateItemStateBounds(itemState: ItemState): AABB2 {
    const transform = calculateItemStateRenderTransform(itemState);
    return transform.transformAABB2(itemState.bounds);
}

function calculateItemStateViewBounds(itemState: ItemState): AABB2 {
    const view = matrices.view.get();
    const bounds = calculateItemStateBounds(itemState);
    return view.transformAABB2(bounds);
}

function calculateItemStateRenderBounds(itemState: ItemState): AABB2 {
    const transform = calculateItemStateRenderTransform(itemState);
    return transform.transformAABB2(itemState.bounds);
}

export type ItemRender = {
    bounds: AABB2,
    texture: GlTexture,
    update: number,
    time: number,
}
const itemRenderMap: Map<string, ItemRender> = new Map();
let itemRenderBuffer: GlFramebuffer | null = null;

function getItemRenderBuffer() {
    if (itemRenderBuffer === null) {
        itemRenderBuffer = glContext.createFramebuffer();
    }
    return itemRenderBuffer;
}

function createItemRenderTexture(itemState: ItemState): ItemRender {
    if (itemRenderMap.has(itemState.id)) {
        throw new Error(`ItemRender ${itemState.item.name}(${itemState.id}) already existing`);
    }
    const bounds = calculateItemStateMaxBounds(itemState);
    const texture = glContext.createTexture();
    const render: ItemRender = {
        bounds,
        texture,
        update: -1,
        time: Time.now(),
    };
    itemRenderMap.set(itemState.id, render);
    return render
}

export function getRenderBounds(itemState: ItemState): AABB2 {
    const matrix = transformToMatrix(itemState.transform);
    return matrix.transformAABB2(itemState.bounds);
}

function calculateItemStateMaxBounds(itemState: ItemState) {
    const ctx = getContext();
    let bounds = AABB2.from(itemState.bounds);
    for (const id of itemState.children) {
        const { bounds: childBounds, transform } = ctx.items[id];
        const matrix = transformToMatrix(transform);
        bounds = bounds.union(matrix.transformAABB2(childBounds));
    }
    return bounds;
}

export function markItemStateChanged(itemState: ItemState) {
    const { items } = getContext();
    const parents = getParents(itemState);
    parents.forEach(parent => {
        parent.update ++;
    });
    itemState.children.forEach(id => {
        items[id].update ++;
    });
    itemState.update ++;
}

export async function getItemStateRender(itemState: ItemState): Promise<ItemRender> {
    const { item, bounds } = itemState;
    const ctx = getContext();
    const buffer = getItemRenderBuffer();
    const render = itemRenderMap.get(itemState.id) ?? createItemRenderTexture(itemState);
    if (render.update === itemState.update) return render;
    const childRenders: Record<string, ItemRender> = {};
    let bufferBounds = AABB2.from(bounds);
    for (const id of itemState.children) {
        const child = ctx.items[id];
        const childRender = await getItemStateRender(child);
        childRenders[id] = childRender;
        const matrix = transformToMatrix(child.transform);
        bufferBounds = bufferBounds.union(matrix.transformAABB2(childRender.bounds));
    }
    render.bounds = bufferBounds;
    const dimentions = bufferBounds.dimensions();
    render.texture.use(() => {
        render.texture.setParams({
            minFilter: 'linear',
            magFilter: 'linear',
            wrapS: 'clamp-to-edge',
            wrapT: 'clamp-to-edge',
        });
        render.texture.ensureSize(dimentions.x, dimentions.y);
    });
    const { gl } = glContext;
    await buffer.useAsync(async () => {
        buffer.attachTexture(render.texture);
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        glContext.stateManager.pushViewport(dimentions);
        matrices.push();
        matrices.identity();
        matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.x, bufferBounds.min.y, bufferBounds.max.y, -1, 1);
        if (item.image) {
            const texture = await getTextureByAsset(item.image);
            const { tex, width, height } = texture;
            draw.texture(
                0, 0,
                width, height,
                tex,
            );
        }
        await invokeBehaviors(itemState, it => it.renderPre, {
            bufferBounds,
            childRenders,
        });
        await invokeBehaviors(itemState, it => it.renderPost, {
            bufferBounds,
            childRenders,
        });
        matrices.pop();
        glContext.stateManager.popViewport();
    });
    render.update = itemState.update;
    render.time = Time.now();
    return render;
}

export async function renderItemState(itemState: ItemState, options: {
    parent?: ItemState,
    showRenderBounds?: boolean,
} = {}) {
    const render = await getItemStateRender(itemState);
    const { bounds, texture } = render;
    const transform = options.parent ? transformToMatrix(itemState.transform) : calculateItemStateRenderTransform(itemState);
    if (options.showRenderBounds) {
        const renderBounds = transform.transformAABB2(bounds);
        draw.rectangleStroke(renderBounds.min.x, renderBounds.min.y, renderBounds.max.x, renderBounds.max.y, Vec4.ONE, 2);
    }
    matrices.model.push();
    matrices.model.multiply(transform);
    if (getContext().held === itemState.id) {
        applyDragEffect();
    }
    draw.texture(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture);
    matrices.model.pop();
}

function restrictPositionToDisplayBounds(itemState: ItemState) {
    if (itemState.layer !== ITEM_LAYERS.KITCHEN_ITEMS) return;
    const containerBounds = AABB2.from({
        min: { x: 0, y: 0 },
        max: { x: 1920 * 2, y: 1080 },
    }).shrink({ x: 100, y: 100 });
    const containerDimentions = containerBounds.dimensions();
    const itemStateBounds = getRenderBounds(itemState);
    const itemStateDimentions = itemStateBounds.dimensions();
    const exceedLeft = containerBounds.min.x - itemStateBounds.max.x;
    const exceedTop = containerBounds.min.y - itemStateBounds.max.y;
    const exceedRight = itemStateBounds.min.x - containerBounds.max.x;
    const exceedBottom = itemStateBounds.min.y - containerBounds.max.y;
    let offsetX = itemState.transform.offset.x;
    let offsetY = itemState.transform.offset.y;
    if (itemStateDimentions.x > containerDimentions.x) {
        offsetX = containerDimentions.x / 2 - itemStateDimentions.x / 2;
    } else if (exceedLeft > 0) {
        offsetX += exceedLeft;
    } else if (exceedRight > 0) {
        offsetX -= exceedRight;
    }
    if (itemStateDimentions.y > containerDimentions.y) {
        offsetY = containerDimentions.y / 2 - itemStateDimentions.y / 2;
    } else if (exceedTop > 0) {
        offsetY += exceedTop;
    } else if (exceedBottom > 0) {
        offsetY -= exceedBottom;
    }
    itemState.transform = {
        ...itemState.transform,
        offset: {
            x: offsetX,
            y: offsetY,
        }
    };
}

export async function renderItems(layers: ItemLayer[]) {
    const { held, side } = getContext();
    const flip = side === 'overlay' ? -1 : 1;
    const itemsInOrder = getAllItemStates(layers, (a, b) => {
        const maxA = calculateItemStateRenderBounds(a).max.y;
        const maxB = calculateItemStateRenderBounds(b).max.y;
        return (((b.transform.offset.y + maxB) - (a.transform.offset.y + maxA))) * (a.layer === 'photo_mode' ? 1 : flip);
    });
    for (const item of itemsInOrder.toReversed()) {
        if (item.id === held) continue;
        if (item.parent) continue;
        restrictPositionToDisplayBounds(item);
        await renderItemState(item);
    }
    for (const item of itemsInOrder.toReversed()) {
        if (item.id === held) continue;
        await invokeBehaviors(item, it => it.renderOverlay, {
            matrices,
        });
    }
}

export async function renderHeldItem() {
    const { side, held, items } = getContext();
    if (!held) return;
    const item = items[held];
    if (!item) return;
    if (side == 'client') {
        const view = matrices.view.get().inverse();
        const delta = view.basisTransform2(mouse.delta);
        item.transform.offset = {
            x: item.transform.offset.x + delta.x,
            y: item.transform.offset.y + delta.y,
        }
    }
    await renderItemState(item);
    await invokeBehaviors(item, it => it.renderOverlay, {
        matrices,
    });
}

export async function isItemHovering(item: ItemState): Promise<boolean> {
    if (!item.item.image) return false;
    const { bounds } = item;
    const { min, max } = bounds;
    const matrix = calculateItemStateRenderTransform(item);
    const inverse = matrix.inverse();
    const inverseMVP = matrices.view.get().inverse();
    const inversedMouse = inverse.transform2(inverseMVP.transform2(mouse.position));
    
    const aabbTest = (
        inversedMouse.x >= min.x &&
        inversedMouse.y >= min.y &&
        inversedMouse.x <= max.x &&
        inversedMouse.y <= max.y
    );
    if (!aabbTest) return false;

    const texture = await getTextureByAsset(item.item.image);
    const uv = inversedMouse.remap(
        min,
        max,
        Vec2.ZERO,
        Vec2.ONE,
    );
    const { width, height } = texture;
    const x = Math.floor(uv.x * width);
    const y = Math.floor(uv.y * height);
    const index = (x + y * width) * 4;
    const alpha = texture.pixels[index + 3];
    return alpha > 0;
}

export async function collectClickActions(): Promise<ClickAction | null> {
    const context = getContext();
    const { items, hovering, held } = context;
    const actions: ClickAction[] = [];
    const hoveringItem = hovering ? items[hovering] : null;
    const heldItem = held ? items[held] : null;
    if (heldItem) {
        await invokeBehaviors(heldItem, it => it.collectActionsHeld, {
            hovering: hoveringItem,
            actions,
        });
    }
    if (hoveringItem) {
        await invokeBehaviors(hoveringItem, it => it.collectActionsHovered, {
            held: heldItem,
            actions,
        });
        const parentItem = hoveringItem.parent ? items[hoveringItem.parent] : null;
        if (parentItem) {
            await invokeBehaviors(parentItem, it => it.collectActionsParent, {
                child: hoveringItem,
                held: heldItem,
                actions,
            });
        }
    }
    if (actions.length === 0) return null;
    const bestAction = actions.sort(comparator((a) => -a.priority))[0];
    return bestAction;
}

export async function renderHoveredItem() {
    const ctx = getContext();
    const action = await collectClickActions();
    if (!action) return;
    const { item: target } = action;
    if (!target.item.image) {
        return;
    }
    const alpha = ctx.held ? 1 : 0.5;
    const color = new Vec4(0, 0, 0, alpha);
    const { bounds, texture } = await getItemStateRender(target);
    const transform = calculateItemStateRenderTransform(target);
    matrices.model.push();
    matrices.model.multiply(transform);
    if (ctx.held === target.id) {
        applyDragEffect();
    }
    draw.textureOutline(
        bounds.min.x, bounds.min.y,
        bounds.max.x, bounds.max.y,
        texture,
        color,
        8,
    );
    draw.textureOutline(
        bounds.min.x, bounds.min.y,
        bounds.max.x, bounds.max.y,
        texture,
        new Vec4(1, 1, 1, 1),
        4,
    );
    matrices.model.pop();
    if (ctx.side === 'client' && action) {
        draw.fontFamily = 'Noto Sans JP';
        draw.fontSize = 16;
        const bounds = calculateItemStateViewBounds(target);
        const screenPos = matrices.projectPoint(bounds.at({ x: 0.5, y: 1 }))
        const pos = matrices.unprojectPoint(screenPos);
        matrices.push();
        matrices.identity();
        matrices.projection.orthographic(0, matrices.width, matrices.height, 0, -1, 1);
        const metrics = draw.measureTextActual(action.name).expand({ x: 10, y: 8 });
        matrices.model.translate(pos.x - (metrics.min.x + metrics.max.x) / 2, pos.y + 20, 0);
        const center = metrics.min.add({ x: (metrics.min.x + metrics.max.x) / 2 + 10, y: 0});
        draw.triangle(center.add({x: -6, y: 0}), center.add({x: 0, y: -6}), center.add({x: 6, y: 0}), new Vec4(0, 0, 0, 1));
        draw.rectangle(metrics.min.x, metrics.min.y, metrics.max.x, metrics.max.y, new Vec4(0, 0, 0, 1));
        await draw.textAlign(Vec2.ZERO, action.name, Vec2.ZERO, Vec4.ONE);
        matrices.pop();
    }
}

export function getAllItemStates(layers: ItemLayer[], order: (a: ItemState, b: ItemState) => number = (a, b) => {
    const maxA = getRenderBounds(a).max.y;
    const maxB = getRenderBounds(b).max.y;
    return (b.transform.offset.y + maxB) - (a.transform.offset.y + maxA);
}): ItemState[] {
    const items: ItemState[] = [];
    function collectItems(item: ItemState, passed: string[]) {
        const children = item.children
            .map((id) => getContext().items[id])
            .filter((entry): entry is ItemState => !!entry)
            .sort(order)
            .sort(comparator((item) => ITEM_LAYERS_LIST.indexOf(item.layer)));
        for (const child of children) {
            collectItems(child, [...passed, item.id]);
        }
        if (passed.includes(item.id)) {
            console.error('Circular reference detected:', passed.join(' -> '), '->', item.id);
            return;
        }
        items.push(item);
    }
    for (const item of Object.values(getContext().items)
        .sort(comparator((item) => -(item.transform.offset.y + item.bounds.max.y)))
        .sort(order)
        .sort(comparator((item) => ITEM_LAYERS_LIST.indexOf(item.layer)))
    ) {
        if (!layers.includes(item.layer)) continue;
        if (item.parent) continue;
        collectItems(item, []);
    }
    return items;
}

const SPECIAL_ITEM_IDS = ['bell', 'counter'];

export async function updateHoveringItem(layers: ItemLayer[]) {
    const ctx = getContext();
    const { items, held, side } = ctx;
    if (side !== 'client') return;
    if (!mouse.over || mouse.ui) {
        ctx.hovering = null;
        return;
    }
    const heldItem = held ? items[held] : null;
    const ignoreItems = heldItem ? [...getParents(heldItem), ...retrieveAllChildItems(heldItem)].map(item => item.id) : [];
    function sort(items: ItemState[]) {
        return items
            .sort(comparator(item => -(item.transform.offset.y + item.bounds.max.y)))
            .sort(comparator(item => ITEM_LAYERS_LIST.indexOf(item.layer)));
    }
    const args = { target: null as ItemState | null };
    async function check(item: ItemState) {
        if (item.id === held) return false;
        if (ignoreItems.includes(item.id)) return false;
        if (!layers.includes(item.layer)) return false;
        const { children } = await invokeBehaviors(item, (behavior) => behavior.handleChildrenOrder, {
            timing: 'hover',
            children: sort(item.children.map(id => items[id])),
        });
        let childHovered = false;
        for (const child of children) {
            if (await check(child)) {
                await invokeBehaviors(item, (behavior) => behavior.handleChildrenHovered, args);
                childHovered = !!args.target;
            }
            if (childHovered) break
        }
        if (childHovered) return true;
        const hovered = await isItemHovering(item);
        if (hovered) {
            args.target = item;
        }
        return hovered;
    }
    const itemsInOrder: ItemState[] = [];
    itemsInOrder.push(
        ...Object.values(items)
        .filter(item => !item.parent)
        .filter(item => layers.includes(item.layer))
        .filter(item => !SPECIAL_ITEM_IDS.includes(item.id))
        .toSorted(comparator((item) => -calculateItemStateRenderBounds(item).max.y))
    );
    if (items['bell']) itemsInOrder.push(items['bell']);
    if (items['counter']) itemsInOrder.push(items['counter']);
    for (const item of itemsInOrder) {
        if (await check(item)) {
            break;
        }
    }
    if (args.target) {
        ctx.hovering = args.target.id;
    } else if (ctx.hovering) {
        ctx.hovering = null;
    }
}

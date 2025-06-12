import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { getTextureByAsset } from './asset.js';
import { type BehaviorFunction, type BehaviorHandler, type BehaviorHandlers, type Behaviors } from './behavior.js';
import type { Effect } from './effect.js';
import { applyDragEffect, draw, getContext, glContext, matrices, mouse } from './game.js';
import { copy, uniqueId } from './helper.js';
import type { Item } from './item.js';
import type { KitchenContext } from './kitchen.js';
import { transformToMatrix, type Bounds, type Transform } from './transform.js';


export const ITEM_LAYERS = {
    PHOTO_MODE: 'photo_mode',
    KITCHEN_ITEMS: 'kitchen_items',
    BELL: 'bell',
    COUNTER: 'counter',
} as const;
export type ItemLayer = typeof ITEM_LAYERS[keyof typeof ITEM_LAYERS];
export const ITEM_LAYERS_LIST: ItemLayer[] = Object.values(ITEM_LAYERS);

export type ItemState = {
    id: string,
    item: Item,
    behaviors: Partial<Behaviors>,
    effects: Record<string, Effect>,
    layer: ItemLayer,
    transform: Transform,
    children: string[],
    parent?: string,
    bounds: Bounds,
};

export function createItemState(context: KitchenContext, options: {
    id?: string,
    item: Item,
    layer?: ItemLayer,
    transform?: Transform,
    children?: string[],
    behaviors?: Partial<Behaviors>,
    effects?: Record<string, Effect>,
    bounds?: Bounds,
}): ItemState {
    const { items } = context;
    const { id, item, layer, transform, children, behaviors, effects, bounds } = options;
    const itemState = {
        id: id ?? uniqueId(),
        item: copy(item),
        layer: layer ?? ITEM_LAYERS.KITCHEN_ITEMS,
        transform: transform ?? copy(item.transform),
        children: children ?? [],
        behaviors: behaviors ?? copy(item.behaviors),
        effects: effects ?? {},
        bounds: bounds ?? copy(item.bounds),
    } satisfies ItemState;
    items[itemState.id] = itemState;
    return itemState;
}

export function cloneItemState(itemState: ItemState, options: {
    layer?: ItemLayer,
    transform?: Transform,
} = {}): ItemState {
    const { items } = getContext();
    const item = createItemState(getContext(), {
        id: uniqueId(),
        item: itemState.item,
        layer: options.layer ?? itemState.layer,
        transform: options.transform ?? itemState.transform,
        children: [],
        behaviors: copy(itemState.behaviors),
        effects: copy(itemState.effects),
        bounds: copy(itemState.bounds),
    });
    items[item.id] = item;
    for (const childId of itemState.children) {
        const child = getContext().items[childId];
        if (!child) continue;
        const childClone = cloneItemState(child, {
            layer: item.layer,
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
}

export function getParents(item: ItemState): ItemState[] {
    const parents: ItemState[] = [];
    let parent: string | undefined = item.parent;
    while (parent) {
        const parentItem = getContext().items[parent];
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
    const items = getContext().items;
    for (const childId of item.children) {
        const child = items[childId];
        if (!child) continue;
        children.push(child);
        retrieveAllChildItems(child, children);
    }
    return children;
}

export function attachChild(item: ItemState, child: ItemState) {
    if (child.parent) {
        detachChildren(getContext().items[child.parent], child);
    }
    const parents = getParents(item);
    if (parents.includes(child)) {
        throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${child.id}`);
    }
    item.children.push(child.id);
    child.parent = item.id;
}

let behaviorHandlers: BehaviorHandlers | undefined = undefined;

export async function loadBehaviorHandlers() {
    const { getBehaviorHandlers } = await import('./behavior.js');
    behaviorHandlers = await getBehaviorHandlers();
}

export async function invokeBehaviors<T extends keyof Behaviors, U>(
    context: KitchenContext,
    item: ItemState,
    getMethod: (handler: BehaviorHandler<T>) => BehaviorFunction<T, U> | undefined,
    args: U,
): Promise<U> {
    if (!behaviorHandlers) {
        throw new Error('Behavior handlers not loaded');
    }
    for (const key in behaviorHandlers) {
        const behavior = item.behaviors[key as keyof Behaviors] as Behaviors[T];
        const handler = behaviorHandlers![key as keyof Behaviors] as BehaviorHandlers[T];
        if (behavior && handler) {
            const method = getMethod(handler)?.bind(handler);
            if (method) {
                await method(context, { item, behavior }, args);
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
        const parents = getParents(item);
        if (parents.includes(child)) {
            throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${child.id}`);
        }
        item.children.push(child.id);
        child.parent = item.id;
    });
}

export function detachChildren(item: ItemState, ...children: ItemState[]) {
    item.children = item.children.filter(childId => !children.some(child => child.id === childId));
    children.forEach(child => {
        child.parent = undefined;
    });
}

const previousTransforms = new Map<string, Mat4>();

export function getItemStateTransform(item: ItemState, options: {
    parent?: ItemState,
} = {}): Mat4 {
    const matrices: Mat4[] = [transformToMatrix(item.transform)];
    const parents: [ItemState, string][] = [];
    const passed: string[] = [];
    let parent: string | undefined = item.parent;
    while (parent) {
        if (passed.includes(parent)) {
            throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${parent}`);
        }
        passed.push(parent);
        const item = getContext().items[parent];
        parents.push([item, parent]);
        if (!item) break;
        matrices.push(transformToMatrix(item.transform));
        parent = item.parent;
    }
    matrices.reverse();
    
    const flipY = item.layer !== ITEM_LAYERS.PHOTO_MODE && getContext().side === 'overlay' && !options.parent;
    if (flipY) {
        const matrix = matrices[0];
        if (item.id === 'counter') {
            const z = matrix.m31 + item.bounds.max.y + 1080;
            matrices[0] = new Mat4(
                matrix.m00, matrix.m01, matrix.m02, matrix.m03,
                matrix.m10, matrix.m11, matrix.m12, matrix.m13,
                matrix.m20, matrix.m21, matrix.m22, matrix.m23,
                matrix.m30, 5000 / z * 260 - 420, matrix.m32, matrix.m33,
            );
        } else {
            const z = matrix.m31 + (item.bounds.max.y + item.bounds.min.y) + 1080;
            if (z < 0) {
                return Mat4.ZERO;
            }
            matrices[0] = new Mat4(
                matrix.m00 * 0.8, matrix.m01, matrix.m02, matrix.m03,
                matrix.m10, matrix.m11 * 0.7, matrix.m12, matrix.m13,
                matrix.m20, matrix.m21, matrix.m22, matrix.m23,
                matrix.m30, 5000 / z * 260 - 500, matrix.m32, matrix.m33,
            );
        }
    }

    let transform = matrices.reduce((acc, matrix) => acc.multiply(matrix), Mat4.IDENTITY);
    if (getContext().side === 'overlay') {
        const previous = previousTransforms.get(item.id) ?? transform;
        transform = previous.lerp(transform, 0.8);
        previousTransforms.set(item.id, transform);
    }
    return transform;
}

export type ItemRender = {
    bounds: AABB2,
    texture: GlTexture,
    changed: boolean,
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
    const bounds = retrieveItemStateBounds(itemState);
    const texture = glContext.createTexture();
    const render: ItemRender = {
        bounds,
        texture,
        changed: true,
    };
    itemRenderMap.set(itemState.id, render);
    return render
}

export function getRenderBounds(itemState: ItemState): AABB2 {
    const matrix = transformToMatrix(itemState.transform);
    return matrix.transformAABB2(itemState.bounds);
}

function retrieveItemStateBounds(itemState: ItemState) {
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
    const existing = itemRenderMap.get(itemState.id);
    if (!existing) return;
    existing.changed = true;
}

export async function getItemStateRender(itemState: ItemState): Promise<ItemRender> {
    const { item, bounds } = itemState;
    const ctx = getContext();
    const buffer = getItemRenderBuffer();
    const render = itemRenderMap.get(itemState.id) ?? createItemRenderTexture(itemState);
    // if (!render.changed) return render;
    const childRenders: Record<string, ItemRender> = {};
    let bufferBounds = AABB2.from(bounds);
    for (const id of itemState.children) {
        const child = ctx.items[id];
        const childRender = await getItemStateRender(child);
        childRenders[id] = childRender;
        const matrix = transformToMatrix(child.transform);
        bufferBounds = bufferBounds.union(matrix.transformAABB2(childRender.bounds));
    }
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
        glContext.gl.clear(glContext.gl.COLOR_BUFFER_BIT);
        glContext.gl.clearColor(1, 1, 1, 0);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
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
        await invokeBehaviors(ctx, itemState, it => it.render, {
            matrices,
            bufferBounds,
            childRenders,
        });
        matrices.pop();
        glContext.stateManager.popViewport();
    });
    render.changed = false;
    return {
        bounds: bufferBounds,
        texture: render.texture,
        changed: false,
    };
}

export async function renderItemState(itemState: ItemState, options: {
    parent?: ItemState,
    showRenderBounds?: boolean,
} = {}) {
    const render = await getItemStateRender(itemState);
    const { bounds, texture } = render;
    const transform = options.parent ? transformToMatrix(itemState.transform) : getItemStateTransform(itemState, options);
    if (options.showRenderBounds) {
        const renderBounds = transform.transformAABB2(bounds);
        draw.rectangleStroke(renderBounds.min.x, renderBounds.min.y, renderBounds.max.x, renderBounds.max.y, Vec4.ONE, 2);
    }
    matrices.model.push();
    matrices.model.multiply(transform);
    draw.texture(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture);
    matrices.model.pop();
}

export async function renderItems(layers: ItemLayer[]) {
    const itemsInOrder = getAllItemStates(layers);
    for (const item of itemsInOrder.toReversed()) {
        if (item.id === getContext().held) continue;
        if (item.parent) continue;
        await renderItemState(item);
    }
}

export async function renderHeldItem() {
    const { side, held } = getContext();
    if (!held) return;
    const item = getContext().items[held];
    if (!item) return;
    if (side == 'client') {
        // delta2 = current - (current + delta)
        const view = matrices.view.get().inverse();
        const delta = view.basisTransform2(mouse.delta);
        item.transform.offset = {
            x: item.transform.offset.x + delta.x,
            y: item.transform.offset.y + delta.y,
        }
    }
    await renderItemState(item);
}

export async function isItemHovering(item: ItemState): Promise<boolean> {
    if (!item.item.image) return false;
    const { bounds } = item;
    const { min, max } = bounds;
    const matrix = getItemStateTransform(item);
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
    return alpha > 16;
}

export async function renderHoveringItem() {
    const { hovering } = getContext();
    if (!hovering) return;
    const itemState = getContext().items[hovering];
    if (!itemState) return;
    const { item } = itemState;
    if (!item.image) {
        return;
    }
    const { canBeHeld } = await invokeBehaviors(getContext(), itemState, it => it.canItemBeHeld, {
        canBeHeld: false,
    });
    if (!getContext().held && !canBeHeld && !itemState.behaviors.action?.on.click) {
        return;
    }
    const alpha = getContext().held ? 1 : 0.5;
    const color = new Vec4(0, 0, 0, alpha);
    const texture = await getTextureByAsset(item.image);
    const { tex, width, height } = texture;
    const transform = getItemStateTransform(itemState);
    matrices.model.push();
    matrices.model.multiply(transform);
    if (getContext().held === itemState.id) {
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
    await invokeBehaviors(getContext(), itemState, it => it.renderItemHoverTooltip, {
        matrices,
    });
}

// export function collectChildren(itemState: ItemState): ItemState[] {
//     const ctx = getContext();
//     const items: ItemState[] = [];
//     const queue: ItemState[] = [itemState];
//     while (queue.length > 0) {
//         const item = queue.pop();
//         if (!item) break;
//         for (const id of item.children) {
//             const child = ctx.items[id];
//             items.push(child);
//             queue.push(child);
//         }
//     }
//     return items;
// }

export function getAllItemStates(layers: ItemLayer[], order: (a: ItemState, b: ItemState) => number = (a, b) => {
    const maxA = a.bounds.max;
    const maxB = b.bounds.max;
    return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
}): ItemState[] {
    const items: ItemState[] = [];
    function collectItems(item: ItemState, passed: string[]) {
        const children = item.children
            .map((id) => getContext().items[id])
            .filter((entry): entry is ItemState => !!entry)
            .sort(order)
            .sort(({layer}, {layer: layerB}) => {
                const indexA = ITEM_LAYERS_LIST.indexOf(layer);
                const indexB = ITEM_LAYERS_LIST.indexOf(layerB);
                return indexA - indexB;
            });
        for (const child of children) {
            collectItems(child, [...passed, item.id]);
        }
        if (passed.includes(item.id)) {
            console.error('Circular reference detected:', passed.join(' -> '), '->', item.id);
            return;
        }
        items.push(item);
    }
    for (const item of Object.values(getContext().items).sort((a, b) => {
        const maxA = a.bounds.max;
        const maxB = b.bounds.max;
        return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
    }).sort(order).sort(({layer}, {layer: layerB}) => {
        const indexA = ITEM_LAYERS_LIST.indexOf(layer);
        const indexB = ITEM_LAYERS_LIST.indexOf(layerB);
        return indexA - indexB;
    })) {
        if (!layers.includes(item.layer)) continue;
        if (item.parent) continue;
        collectItems(item, []);
    }
    return items;
}

export async function updateHoveringItem(layers: ItemLayer[]) {
    const ctx = getContext();
    if (ctx.side !== 'client') return;
    if (!mouse.over || mouse.ui) {
        ctx.hovering = null;
        return;
    }
    const held = ctx.held;
    const heldItem = held ? ctx.items[held] : null;
    const ignoreItems = heldItem ? [...getParents(heldItem), ...retrieveAllChildItems(heldItem)].map(item => item.id) : [];
    const items = ctx.items;
    function sort(items: ItemState[]) {
        return items.sort((a: ItemState, b: ItemState) => {
            const maxA = a.bounds.max;
            const maxB = b.bounds.max;
            return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
        }).sort(({layer}, {layer: layerB}) => {
            const indexA = ITEM_LAYERS_LIST.indexOf(layer);
            const indexB = ITEM_LAYERS_LIST.indexOf(layerB);
            return indexA - indexB;
        });
    }
    const args = { target: null as ItemState | null };
    async function check(item: ItemState) {
        if (item.id === ctx.held) return false;
        if (ignoreItems.includes(item.id)) return false;
        if (!layers.includes(item.layer)) return false;
        const { children } = await invokeBehaviors(ctx, item, (behavior) => behavior.handleChildrenOrder, {
            timing: 'hover',
            children: sort(item.children.map(id => items[id])),
        });
        let childHovered = false;
        for (const child of children) {
            if (await check(child)) {
                await invokeBehaviors(ctx, item, (behavior) => behavior.handleChildrenHovered, args);
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
    for (const item of sort(Object.values(items))) {
        if (item.parent) continue;
        if (!layers.includes(item.layer)) continue;
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

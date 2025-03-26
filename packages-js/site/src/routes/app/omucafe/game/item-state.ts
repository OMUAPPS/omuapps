import { AABB2 } from '$lib/math/aabb2.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec2 } from '$lib/math/vec2.js';
import { Vec4 } from '$lib/math/vec4.js';
import { getTextureByAsset } from './asset.js';
import { type BehaviorFunction, type BehaviorHandler, type BehaviorHandlers, type Behaviors } from './behavior.js';
import type { Effect } from './effect.js';
import { applyDragEffect, context, draw, matrices, mouse } from './game.js';
import { copy, uniqueId } from './helper.js';
import type { Item } from './item.js';
import type { KitchenContext } from './kitchen.js';
import { transformToMatrix, type Bounds, type Transform } from './transform.js';

export type ItemState = {
    id: string,
    item: Item,
    behaviors: Partial<Behaviors>,
    effects: Record<string, Effect>,
    transform: Transform,
    children: string[],
    parent?: string,
    bounds: Bounds,
};

export function createItemState(context: KitchenContext, options: {
    id?: string,
    item: Item,
    transform?: Transform,
    children?: string[],
    behaviors?: Partial<Behaviors>,
    bounds?: Bounds,
}): ItemState {
    const { items } = context;
    const { id, item, transform, children, behaviors, bounds } = options;
    const itemState = {
        id: id ?? uniqueId(),
        item: copy(item),
        transform: transform ?? copy(item.transform),
        children: children ?? [],
        behaviors: behaviors ?? copy(item.behaviors),
        effects: {},
        bounds: bounds ?? copy(item.bounds),
    } satisfies ItemState;
    items[itemState.id] = itemState;
    return itemState;
}

let behaviorHandlers: BehaviorHandlers | undefined = undefined;

export async function loadBehaviorHandlers() {
    const { getBehaviorHandlers } = await import('./behavior.js');
    behaviorHandlers = getBehaviorHandlers();
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
            const method = getMethod(handler);
            if (method) {
                await method(context, { item, behavior }, args);
            }
        }
    }
    return args;
}

export function attachChildren(item: ItemState, ...children: ItemState[]) {
    item.children.push(...children.map(child => child.id));
    children.forEach(child => {
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
        const item = context.items[parent];
        parents.push([item, parent]);
        if (!item) break;
        matrices.push(transformToMatrix(item.transform));
        parent = item.parent;
    }
    matrices.reverse();
    
    const flipY = context.side === 'overlay' && !options.parent;
    if (flipY) {
        // const offsetY = matrices[0].m31;
        // const scale = 1 + BetterMath.clamp(0, 1, offsetY / 1500);
        // matrices[0] = matrices[0].scale(scale, scale, scale);
        const matrix = matrices[0];
        if (item.id === 'counter') {
            matrices[0] = new Mat4(
                matrix.m00, matrix.m01, matrix.m02, matrix.m03,
                matrix.m10, matrix.m11, matrix.m12, matrix.m13,
                matrix.m20, matrix.m21, matrix.m22, matrix.m23,
                matrix.m30, -matrix.m31 - item.bounds.max.y + 330, matrix.m32, matrix.m33,
            );
        } else {
            const z = Math.max(Math.min(matrix.m31 - item.bounds.max.y / 2 + 400, 2000), 1);
            matrices[0] = new Mat4(
                matrix.m00 * 0.8, matrix.m01, matrix.m02, matrix.m03,
                matrix.m10, matrix.m11 * 0.7, matrix.m12, matrix.m13,
                matrix.m20, matrix.m21, matrix.m22, matrix.m23,
                matrix.m30, 4000 / z * 10 + 100, matrix.m32, matrix.m33,
            );
        }
    }

    let transform = matrices.reduce((acc, matrix) => acc.multiply(matrix), Mat4.IDENTITY);
    if (context.side === 'overlay') {
        const previous = previousTransforms.get(item.id) ?? transform;
        transform = previous.lerp(transform, 0.8);
        previousTransforms.set(item.id, transform);
    }
    return transform;
}

export async function getItemStateRenderBounds(item: ItemState): Promise<Bounds> {
    const transform = getItemStateTransform(item);
    const bounds = item.bounds;
    const renderBounds = new AABB2(
        transform.transform2(bounds.min),
        transform.transform2(bounds.max),
    )
    return renderBounds;
}

export async function renderItemState(itemState: ItemState, options: {
    parent?: ItemState,
} = {}) {
    const { item } = itemState;
    if (!item.image) {
        return;
    }
    const texture = await getTextureByAsset(item.image);
    const { tex, width, height } = texture;
    const transform = options.parent ? transformToMatrix(itemState.transform) : getItemStateTransform(itemState, options);
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
        matrices,
    });
    matrices.model.pop();
}

export async function renderItems() {
    for (const [id, item] of Object.entries(context.items).sort(([, a], [, b]) => {
        const maxA = a.bounds.max;
        const maxB = b.bounds.max;
        return (a.transform.offset.y + maxA.y) - (b.transform.offset.y + maxB.y);
    })) {
        if (id === context.held) continue;
        if (item.parent) continue;
        if (item.id === 'counter') continue;
        await renderItemState(item);
    }
}

export async function renderHeldItem() {
    const { held } = context;
    if (!held) return;
    const item = context.items[held];
    if (!item) return;
    item.transform.offset = {
        x: item.transform.offset.x + mouse.delta.x,
        y: item.transform.offset.y + mouse.delta.y,
    }
    await renderItemState(item);
}

export async function isItemHovering(item: ItemState): Promise<boolean> {
    if (!item.item.image) return false;
    const { bounds } = item;
    const { min, max } = bounds;
    const matrix = getItemStateTransform(item);
    const inverse = matrix.inverse();
    const inversedMouse = inverse.transform2(mouse.position);
    
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
    return alpha > 128;
}

export async function renderHoveringItem() {
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
    const { tex, width, height } = texture;
    const transform = getItemStateTransform(itemState);
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
        matrices,
    });
}

export function getAllItemStates(order: (a: ItemState, b: ItemState) => number = (a, b) => {
    const maxA = a.bounds.max;
    const maxB = b.bounds.max;
    return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
}): ItemState[] {
    const items: ItemState[] = [];
    function collectItems(item: ItemState, passed: string[]) {
        const children = item.children
            .map((id) => context.items[id])
            .filter((entry): entry is ItemState => !!entry)
            .sort(order);
        for (const child of children) {
            collectItems(child, [...passed, item.id]);
        }
        if (passed.includes(item.id)) {
            console.error('Circular reference detected:', passed.join(' -> '), '->', item.id);
            return;
        }
        items.push(item);
    }
    for (const item of Object.values(context.items).sort((a, b) => {
        const maxA = a.bounds.max;
        const maxB = b.bounds.max;
        return (b.transform.offset.y + maxB.y) - (a.transform.offset.y + maxA.y);
    })) {
        if (!item.parent) {
            collectItems(item, []);
        }
    }
    return items;
}

export async function updateHoveringItem() {
    let hit = false;
    const itemsInOrder = getAllItemStates();
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

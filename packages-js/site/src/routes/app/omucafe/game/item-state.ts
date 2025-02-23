import { Mat4 } from '$lib/math/mat4.js';
import { type BehaviorFunction, type BehaviorHandler, type BehaviorHandlers, type Behaviors } from './behavior.js';
import type { Effect } from './effect.js';
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

export function getItemStateTransform(context: KitchenContext, item: ItemState, options: {
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

import { Mat4 } from '$lib/math/mat4.js';
import { BEHAVIOR_HANDLERS, type BehaviorFunction, type BehaviorHandler, type Behaviors } from './behavior.js';
import { copy } from './helper.js';
import type { Ingredient } from './ingredient.js';
import type { KitchenContext } from './kitchen.js';
import { transformToMatrix, type Bounds, type Transform } from './transform.js';

export type KitchenItem = {
    type: 'ingredient',
    id: string,
    ingredient: Ingredient,
    behaviors: Partial<Behaviors>,
    transform: Transform,
    children: string[],
    parent?: string,
    bounds: Bounds,
    zIndex: number,
};

export function createKitchenItem(id: string, ingredient: Ingredient): KitchenItem {
    return {
        type: 'ingredient',
        id,
        ingredient: copy(ingredient),
        transform: copy(ingredient.behaviors.fixed?.transform || ingredient.transform),
        children: [],
        behaviors: copy(ingredient.behaviors),
        bounds: copy(ingredient.bounds),
        zIndex: 0,
    };
}

export function callBehaviorHandler<T extends keyof Behaviors, U>(
    context: KitchenContext,
    item: KitchenItem,
    getMethod: (handler: BehaviorHandler<T>) => BehaviorFunction<T, U> | undefined,
    args: U,
): U {
    Object.keys(BEHAVIOR_HANDLERS).forEach(key => {
        const behavior = item.behaviors[key as keyof Behaviors] as Behaviors[T];
        const handler = BEHAVIOR_HANDLERS[key as keyof Behaviors] as typeof BEHAVIOR_HANDLERS[T];
        if (behavior && handler) {
            const method = getMethod(handler);
            if (method) {
                method(context, { item, behavior }, args);
            }
        }
    });
    return args;
}

export function attachChildren(item: KitchenItem, ...children: KitchenItem[]) {
    item.children.push(...children.map(child => child.id));
    children.forEach(child => {
        child.parent = item.id;
    });
}

export function detachChildren(item: KitchenItem, ...children: KitchenItem[]) {
    item.children = item.children.filter(childId => !children.some(child => child.id === childId));
    children.forEach(child => {
        child.parent = undefined;
    });
}

export function getItemTransform(context: KitchenContext,item: KitchenItem, options: {
    parent?: KitchenItem,
} = {}): Mat4 {
    const matrices: Mat4[] = [transformToMatrix(item.transform)];
    const parents: string[] = [];
    let parent: string | undefined = item.parent;
    while (parent) {
        if (parents.includes(parent)) {
            throw new Error(`Circular reference detected: ${parents.join(' -> ')} -> ${parent}`);
        }
        parents.push(parent);
        const item = context.items[parent];
        if (!item) break;
        matrices.push(transformToMatrix(item.transform));
        parent = item.parent;
    }
    matrices.reverse();
    
    const flipY = context.side === 'asset' && !options.parent;
    if (flipY) {
        const matrix = matrices[0];
        matrices[0] = new Mat4(
            matrix.m00, matrix.m01, matrix.m02, matrix.m03,
            matrix.m10, matrix.m11, matrix.m12, matrix.m13,
            matrix.m20, matrix.m21, matrix.m22, matrix.m23,
            matrix.m30, -matrix.m31, matrix.m32, matrix.m33,
        );
    }

    const transform = matrices.reduce((acc, matrix) => acc.multiply(matrix), Mat4.IDENTITY);
    return transform;
}

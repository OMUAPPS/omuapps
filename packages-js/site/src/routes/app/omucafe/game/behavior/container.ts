import type { Asset } from '../asset.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import { detachChildren, getItemTransform, type KitchenItem } from '../kitchen-item.js';
import type { KitchenContext } from '../kitchen.js';
import { createTransform, transformToMatrix, type Transform } from '../transform.js';

export type Container = {
    overlay: Asset | null,
    overlayTransform: Transform,
    items: string[],
}

export function createContainer(): Container {
    return {
        overlay: null,
        overlayTransform: createTransform(),
        items: [],
    };
}

export const ContainerHandler: BehaviorHandler<'container'> = {
    handleClickChild(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { child: KitchenItem },
    ) {
        const { item, behavior } = action;
        const { child } = args;
        behavior.items = behavior.items.filter((id) => id !== child.id);
        detachChildren(item, child);
        const containerTransform = getItemTransform(context, item);
        const heldTransform = transformToMatrix(child.transform);
        const newMatrix = containerTransform.multiply(heldTransform);
        child.transform = {
            right: {x: newMatrix.m00, y: newMatrix.m01},
            up: {x: newMatrix.m10, y: newMatrix.m11},
            offset: {x: newMatrix.m30, y: newMatrix.m31},
        };
    },
};

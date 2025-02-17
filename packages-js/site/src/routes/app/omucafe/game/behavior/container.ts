import type { Draw } from '$lib/components/canvas/draw.js';
import type { GlContext } from '$lib/components/canvas/glcontext.js';
import type { Matrices } from '$lib/components/canvas/matrices.js';
import { Vec2 } from '$lib/math/vec2.js';
import type { Asset } from '../asset.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import { attachChildren, detachChildren, getItemStateTransform, type ItemState } from '../item-state.js';
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

export class ContainerHandler implements BehaviorHandler<'container'> {
    async render(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { gl: GlContext, matrices: Matrices, draw: Draw },
    ) {
        const { renderItem, getTextureByAsset } = context;
        const { item, behavior } = action;
        const { gl, matrices, draw } = args;
        for (const child of behavior.items
            .map((id): ItemState | undefined => context.items[id])
            .filter((entry): entry is ItemState => !!entry)
            .sort((a, b) => {
                const maxA = a.bounds.max;
                const maxB = b.bounds.max;
                return (a.transform.offset.y + maxA.y) - (b.transform.offset.y + maxB.y);
            })) {
            await renderItem(child, {
                parent: item,
            });
        }
        if (behavior.overlay) {
            matrices.model.push();
            const transform = transformToMatrix(behavior.overlayTransform);
            matrices.model.multiply(transform);
            const containerTexture = await getTextureByAsset(behavior.overlay);
            const { tex, width, height } = containerTexture;
            draw.texture(
                0, 0,
                width, height,
                tex,
            );
            matrices.model.pop();
        }
    }

    handleDropChild(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { child: ItemState },
    ) {
        const { item, behavior } = action;
        const { child } = args;
        if (behavior.items.includes(item.id)) {
            return;
        }
        behavior.items = [
            ...behavior.items,
            child.id,
        ];
        attachChildren(item, child);
        const containerTransform = getItemStateTransform(context, item);
        const childTransform = transformToMatrix(child.transform);
        const inverse = containerTransform.inverse();
        const newMatrix = inverse.multiply(childTransform);
        child.transform = {
            right: new Vec2(newMatrix.m00, newMatrix.m01),
            up: new Vec2(newMatrix.m10, newMatrix.m11),
            offset: new Vec2(newMatrix.m30, newMatrix.m31),
        };
    }

    handleClickChild(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { child: ItemState },
    ) {
        const { item, behavior } = action;
        const { child } = args;
        behavior.items = behavior.items.filter((id) => id !== child.id);
        detachChildren(item, child);
        const containerTransform = getItemStateTransform(context, item);
        const heldTransform = transformToMatrix(child.transform);
        const newMatrix = containerTransform.multiply(heldTransform);
        child.transform = {
            right: {x: newMatrix.m00, y: newMatrix.m01},
            up: {x: newMatrix.m10, y: newMatrix.m11},
            offset: {x: newMatrix.m30, y: newMatrix.m31},
        };
    }
};

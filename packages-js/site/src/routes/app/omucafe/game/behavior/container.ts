import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import type { Matrices } from '$lib/components/canvas/matrices.js';
import { AABB2 } from '$lib/math/aabb2.js';
import type { Mat4 } from '$lib/math/mat4.js';
import { getTextureByAsset, type Asset } from '../asset.js';
import type { BehaviorAction, BehaviorHandler } from '../behavior.js';
import { draw, glContext, matrices } from '../game.js';
import { attachChildren, detachChildren, getItemStateTransform, type ItemRender, type ItemState } from '../item-state.js';
import type { KitchenContext } from '../kitchen.js';
import { transformToMatrix, type Transform } from '../transform.js';

export type Container = {
    limitToBounds?: boolean,
    mask?: {
        asset?: Asset,
    },
    overlay?: {
        asset: Asset,
        transform: Transform,
    }
}

export function createContainer(options: {
    limitToBounds?: boolean,
    mask?: {
        asset?: Asset,
    }
    overlay?: {
        asset: Asset,
        transform: Transform,
    }
} = {}): Container {
    const { limitToBounds, mask, overlay } = options;
    return {
        limitToBounds,
        mask,
        overlay,
    };
}

export class ContainerHandler implements BehaviorHandler<'container'> {
    private readonly maskBuffer: GlFramebuffer;
    private readonly maskTexture: GlTexture;
    
    constructor() {
        const maskBuffer = glContext.createFramebuffer();
        const maskTexture = glContext.createTexture();
        maskTexture.use(() => {
            maskTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        })
        maskBuffer.use(() => {
            maskBuffer.attachTexture(maskTexture);
        });
        this.maskBuffer = maskBuffer;
        this.maskTexture = maskTexture;
    }
    
    async render(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { matrices: Matrices, bufferBounds: AABB2, childRenders: Record<string, ItemRender> },
    ) {
        const { item, behavior } = action;
        const { bufferBounds, childRenders } = args;
        const dimentions = bufferBounds.dimensions();
        this.maskTexture.use(() => {
            this.maskTexture.ensureSize(dimentions.x, dimentions.y);
        });
        await this.maskBuffer.useAsync(async () => {
            glContext.gl.clear(glContext.gl.COLOR_BUFFER_BIT);
            glContext.gl.clearColor(0, 0, 0, 0);
            glContext.stateManager.pushViewport(dimentions);
            matrices.push();
            matrices.identity();
            matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.x, bufferBounds.min.y, bufferBounds.max.y, -1, 1);
            for (const child of item.children
                .map((id): ItemState | undefined => context.items[id])
                .filter((entry): entry is ItemState => !!entry)
                .sort((a, b) => {
                    const maxA = a.bounds.max;
                    const maxB = b.bounds.max;
                    return (a.transform.offset.y + maxA.y) - (b.transform.offset.y + maxB.y);
                })) {
                const { bounds, texture } = childRenders[child.id];
                const transform = transformToMatrix(child.transform);
                matrices.model.push();
                matrices.model.multiply(transform);
                draw.texture(bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y, texture);
                matrices.model.pop();
            }
            matrices.pop();
            glContext.stateManager.popViewport();
        });
        draw.texture(bufferBounds.min.x, bufferBounds.min.y, bufferBounds.max.x, bufferBounds.max.y, this.maskTexture);
        if (behavior.overlay) {
            matrices.model.push();
            const transform = transformToMatrix(behavior.overlay.transform);
            matrices.model.multiply(transform);
            const containerTexture = await getTextureByAsset(behavior.overlay.asset);
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
        attachChildren(item, child);
        const containerTransform = getItemStateTransform(item);
        const childTransform = transformToMatrix(child.transform);
        const inverse = containerTransform.inverse();
        const newMatrix = inverse.multiply(childTransform);
        child.transform = {
            right: { x: newMatrix.m00, y: newMatrix.m01 },
            up: { x: newMatrix.m10, y: newMatrix.m11 },
            offset: { x: newMatrix.m30, y: newMatrix.m31 },
        };
        if (behavior.limitToBounds) {
            this.restrictBounds(item, newMatrix, child);
        }
    }

    private restrictBounds(item: ItemState, newMatrix: Mat4, child: ItemState) {
        const containerBounds = AABB2.from(item.bounds);
        const containerDimentions = containerBounds.dimensions();
        const childBounds = newMatrix.transformAABB2(child.bounds);
        const childDimentions = childBounds.dimensions();
        console.log(containerBounds.intersects(childBounds));
        const exceedLeft = containerBounds.min.x - childBounds.min.x;
        const exceedTop = containerBounds.min.y - childBounds.min.y;
        const exceedRight = childBounds.max.x - containerBounds.max.x;
        const exceedBottom = childBounds.max.y - containerBounds.max.y;
        let offsetX = child.transform.offset.x;
        let offsetY = child.transform.offset.y;
        if (childDimentions.x > containerDimentions.x) {
            offsetX = containerDimentions.x / 2 - childDimentions.x / 2;
        } else if (exceedLeft > 0) {
            offsetX += exceedLeft;
        } else if (exceedRight > 0) {
            offsetX -= exceedRight;
        }
        if (childDimentions.y > containerDimentions.y) {
            offsetY = containerDimentions.y / 2 - childDimentions.y / 2;
        } else if (exceedTop > 0) {
            offsetY += exceedTop;
        } else if (exceedBottom > 0) {
            offsetY -= exceedBottom;
        }
        child.transform = {
            ...child.transform,
            offset: {
                x: offsetX,
                y: offsetY,
            }
        };
    }

    handleClickChild(
        context: KitchenContext,
        action: BehaviorAction<'container'>,
        args: { child: ItemState },
    ) {
        const { item } = action;
        const { child } = args;
        detachChildren(item, child);
        const containerTransform = getItemStateTransform(item);
        const heldTransform = transformToMatrix(child.transform);
        const newMatrix = containerTransform.multiply(heldTransform);
        child.transform = {
            right: {x: newMatrix.m00, y: newMatrix.m01},
            up: {x: newMatrix.m10, y: newMatrix.m11},
            offset: {x: newMatrix.m30, y: newMatrix.m31},
        };
    }
};

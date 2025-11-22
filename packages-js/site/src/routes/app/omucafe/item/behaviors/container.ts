import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext.js';
import { comparator } from '$lib/helper.js';
import { AABB2 } from '$lib/math/aabb2.js';
import { get, writable } from 'svelte/store';
import { getTextureByAsset, type Asset } from '../../asset/asset.js';
import { draw, getContext, glContext, matrices } from '../../game/game.js';
import { transformToMatrix, type Transform } from '../../game/transform.js';
import type { BehaviorAction, BehaviorHandler, ClickAction } from '../behavior.js';
import { attachChildren, cloneItemState, detachChildren, getRenderBounds, isChildRecursively, ITEM_LAYERS, removeItemState, type ItemRender, type ItemState } from '../item-state.js';

export type LiquidLayer = {
    side: Asset;
    top: Asset;
    volume: number;
};
export type Container = {
    bounded?: {
        left: boolean;
        top: boolean;
        right: boolean;
        bottom: boolean;
    };
    mask?: {
        asset: Asset;
        transform: Transform;
    };
    overlay?: {
        asset: Asset;
        transform: Transform;
    };
    order?: 'up' | 'down';
    spawn?: null;
};

export function createContainer(options?: Container): Container {
    return options ?? {};
}

export const showMask = writable(false);

export class ContainerHandler implements BehaviorHandler<'container'> {
    private readonly childrenBuffer: GlFramebuffer;
    private readonly childrenBufferTexture: GlTexture;
    private readonly maskBuffer: GlFramebuffer;
    private readonly maskBufferTexture: GlTexture;

    constructor() {
        const childrenBuffer = glContext.createFramebuffer();
        const childrenBufferTexture = glContext.createTexture();
        childrenBufferTexture.use(() => {
            childrenBufferTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        childrenBuffer.use(() => {
            childrenBuffer.attachTexture(childrenBufferTexture);
        });
        this.childrenBuffer = childrenBuffer;
        this.childrenBufferTexture = childrenBufferTexture;
        const maskBuffer = glContext.createFramebuffer();
        const maskBufferTexture = glContext.createTexture();
        maskBufferTexture.use(() => {
            maskBufferTexture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        maskBuffer.use(() => {
            maskBuffer.attachTexture(maskBufferTexture);
        });
        this.maskBuffer = maskBuffer;
        this.maskBufferTexture = maskBufferTexture;
    }

    preLoadAssets(action: BehaviorAction<'container'>): Promise<void> | void {
        const { item, behavior } = action;
        if (behavior.mask) {
            getTextureByAsset(behavior.mask.asset);
        }
        if (behavior.overlay) {
            getTextureByAsset(behavior.overlay.asset);
        }
        if (get(showMask) && behavior.mask && item.layer === ITEM_LAYERS.EDIT_PREVIEW) {
            const { asset } = behavior.mask;
            getTextureByAsset(asset);
        }
    }

    async renderPre(
        action: BehaviorAction<'container'>,
        args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender> },
    ) {
        const { item, behavior, context } = action;
        const { bufferBounds, childRenders } = args;
        const dimentions = bufferBounds.dimensions();
        this.childrenBufferTexture.use(() => {
            this.childrenBufferTexture.ensureSize(dimentions.x, dimentions.y);
        });
        const { gl } = glContext;
        await this.childrenBuffer.useAsync(async () => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.clearColor(1, 1, 1, 0);
            glContext.stateManager.pushViewport(dimentions);
            matrices.push();
            matrices.identity();
            matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.y, bufferBounds.max.x, bufferBounds.min.y, -1, 1);
            for (const child of item.children
                .map((id): ItemState | undefined => context.items[id])
                .filter((entry): entry is ItemState => !!entry)
                .sort((a, b) => {
                    const maxA = getRenderBounds(a).max.y;
                    const maxB = getRenderBounds(b).max.y;
                    return (maxA - maxB) * (behavior.order === 'down' ? -1 : 1);
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
        if (behavior.mask) {
            const { asset } = behavior.mask;
            const transform = transformToMatrix(behavior.mask.transform);
            const { tex, width, height } = await getTextureByAsset(asset);
            this.maskBufferTexture.use(() => {
                this.maskBufferTexture.ensureSize(dimentions.x, dimentions.y);
            });
            this.maskBuffer.use(() => {
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.clearColor(1, 1, 1, 0);
                glContext.stateManager.pushViewport(dimentions);
                matrices.push();
                matrices.identity();
                matrices.projection.orthographic(bufferBounds.min.x, bufferBounds.max.y, bufferBounds.max.x, bufferBounds.min.y, -1, 1);
                matrices.model.multiply(transform);
                draw.texture(0, 0, width, height, tex);
                matrices.pop();
                glContext.stateManager.popViewport();
            });
            draw.textureMask(bufferBounds.min.x, bufferBounds.min.y, bufferBounds.max.x, bufferBounds.max.y, this.childrenBufferTexture, this.maskBufferTexture);
        } else {
            draw.texture(bufferBounds.min.x, bufferBounds.min.y, bufferBounds.max.x, bufferBounds.max.y, this.childrenBufferTexture);
        }
    }

    async renderPost(
        action: BehaviorAction<'container'>,
        args: { bufferBounds: AABB2; childRenders: Record<string, ItemRender> },
    ) {
        const { item, behavior, context } = action;
        const { bufferBounds } = args;
        const dimentions = bufferBounds.dimensions();
        this.childrenBufferTexture.use(() => {
            this.childrenBufferTexture.ensureSize(dimentions.x, dimentions.y);
        });
        const isChildHovering = context.hovering === item.id || context.hovering && isChildRecursively(context.items[item.id], context.items[context.hovering]);
        if (behavior.overlay && !(context.held && isChildHovering)) {
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
        if (get(showMask) && behavior.mask && item.layer === ITEM_LAYERS.EDIT_PREVIEW) {
            const { asset } = behavior.mask;
            const transform = transformToMatrix(behavior.mask.transform);
            const { tex, width, height } = await getTextureByAsset(asset);
            matrices.push();
            matrices.model.multiply(transform);
            draw.texture(0, 0, width, height, tex);
            matrices.pop();
        }
    }

    #restrictBounds(container: Container, item: ItemState, child: ItemState) {
        const { bounded } = container;
        if (!bounded) return;
        const containerBounds = AABB2.from(item.bounds);
        const containerDimentions = containerBounds.dimensions();
        const childBounds = getRenderBounds(child);
        const childDimentions = childBounds.dimensions();
        const exceedLeft = containerBounds.min.x - childBounds.min.x;
        const exceedTop = containerBounds.min.y - childBounds.min.y;
        const exceedRight = childBounds.max.x - containerBounds.max.x;
        const exceedBottom = childBounds.max.y - containerBounds.max.y;
        let offsetX = child.transform.offset.x;
        let offsetY = child.transform.offset.y;
        if (bounded.left && bounded.right && childDimentions.x > containerDimentions.x) {
            offsetX = containerDimentions.x / 2 - childDimentions.x / 2;
        } else if (bounded.left && exceedLeft > 0) {
            offsetX += exceedLeft;
        } else if (bounded.right && exceedRight > 0) {
            offsetX -= exceedRight;
        }
        if (bounded.top && bounded.bottom && childDimentions.y > containerDimentions.y) {
            offsetY = containerDimentions.y / 2 - childDimentions.y / 2;
        } else if (bounded.top && exceedTop > 0) {
            offsetY += exceedTop;
        } else if (bounded.bottom && exceedBottom > 0) {
            offsetY -= exceedBottom;
        }
        child.transform = {
            ...child.transform,
            offset: {
                x: offsetX,
                y: offsetY,
            },
        };
    }

    get #isInEdit() {
        return getContext().scene.type === 'kitchen_edit';
    }

    collectActionsHovered(action: BehaviorAction<'container'>, args: { held: ItemState | null; actions: ClickAction[] }): Promise<void> | void {
        const { item, behavior, context } = action;
        const { held, actions } = args;
        if (!held) return;
        if (behavior.spawn && !this.#isInEdit) {
            const ctx = getContext();
            const sameItemContained = item.children.some((id) => {
                const child = ctx.items[id];
                return child.item.id === held.item.id;
            });
            if (!sameItemContained) return;
            actions.push({
                name: `${held.item.name}をしまう`,
                priority: 20,
                item,
                callback: async () => {
                    context.held = null;
                    removeItemState(held);
                },
            });
        }
        actions.push({
            name: `${held.item.name}を置く`,
            priority: 20,
            item,
            callback: async () => {
                context.held = null;
                attachChildren(item, held);
                this.#restrictBounds(behavior, item, held);
            },
        });
    }

    collectActionsParent(action: BehaviorAction<'container'>, args: { child: ItemState; held: ItemState | null; actions: ClickAction[] }): Promise<void> | void {
        const { behavior, context } = action;
        const { child, actions, held } = args;
        if (held) return;
        if (behavior.spawn && !this.#isInEdit) {
            actions.push({
                name: `${child.item.name}を取り出す`,
                priority: 10,
                item: child,
                callback: async () => {
                    const clone = cloneItemState(child);
                    context.held = clone.id;
                },
            });
            return;
        }
        actions.push({
            name: `${child.item.name}を取り出す`,
            priority: 10,
            item: child,
            callback: async () => {
                const { item } = action;
                context.held = child.id;
                detachChildren(item, child);
            },
        });
    }

    handleChildrenOrder(action: BehaviorAction<'container'>, args: { timing: 'hover'; children: ItemState[] }): Promise<void> | void {
        const { behavior } = action;
        const { timing, children } = args;
        if (timing !== 'hover') return;
        children.sort(comparator((item) => {
            return getRenderBounds(item).max.y * (behavior.order === 'down' ? 1 : -1);
        }));
    }

    handleChildrenHovered(action: BehaviorAction<'container'>, args: { target: ItemState | null }): Promise<void> | void {
        const { context, behavior } = action;
        if (context.held) {
            if (!behavior.spawn && args.target?.behaviors.container) return;
            args.target = action.item;
        }
    }
};

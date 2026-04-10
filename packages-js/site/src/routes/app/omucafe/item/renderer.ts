import { AABB2 } from '$lib/math/aabb2';
import type { Transform2D } from '$lib/math/transform2d';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import { getTransform } from '../core/transform';
import type { ItemRender, ItemRenderState } from './attribute-handler';
import type { Item, ItemPool, PoolOptions } from './item';

export interface PoolRenderPass {
    pools: Record<string, PoolOptions>;
}

export class ItemRenderer {
    public renderPass: PoolRenderPass | undefined;
    public renderPassStack: PoolRenderPass[] = [];
    private itemRender: Map<string, ItemRenderState> = new Map();

    constructor(
        private readonly game: Game,
    ) { }

    public initPass() {
        this.renderPass = undefined;
    }

    public pushPass() {
        if (!this.renderPass) {
            throw new Error('No active render pass to push.');
        }
        this.renderPassStack.push(this.renderPass);
        this.renderPass = {
            pools: {
                ...this.renderPass.pools,
            },
        };
    }

    public popPass() {
        if (this.renderPassStack.length === 0) {
            throw new Error('No render pass to pop.');
        }
        this.renderPass = this.renderPassStack.pop();
    }

    public addPool(options: PoolOptions) {
        if (!this.renderPass) {
            this.renderPass = { pools: {} };
        }
        if (this.renderPass.pools[options.pool.id]) {
            throw new Error(`Pool with id ${options.pool.id} already exists in the current render pass.`);
        }
        this.renderPass.pools[options.pool.id] = options;
    }

    // =========================================================================================
    // Rendering
    // =========================================================================================

    public async renderPool(pool: ItemPool, options: PoolOptions): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        const { items } = this.game.item;
        const states = this.game.states.itemStates.value;
        const poolItems = Object.values(pool.items);
        matrices.view.push();
        matrices.view.multiply(getTransform(options.transform).getMat4());
        this.renderPass ??= { pools: {} };
        if (this.renderPass.pools[options.pool.id]) {
            throw new Error(`Pool with id ${options.pool.id} already exists.`);
        }
        this.renderPass.pools[options.pool.id] = options;

        // Render Items
        for (const { id } of poolItems) {
            const item = items.get(id);
            if (!item) {
                // Garbage collection: Remove reference if item no longer exists
                delete pool.items[id];
                continue;
            }
            if (pool.id !== item.pool) {
                delete pool.items[id];
                continue;
            }
            // Skip if child (children are rendered by parents)
            if (item.parent) continue;
            if (states.held === item.id) continue;

            const renderState = await this.getItemRender(item);
            if (renderState.type === 'rendered') {
                const { renderBounds, texture } = renderState.render;
                matrices.model.push();
                matrices.model.multiply(getTransform(item.transform).getMat4());
                draw.textureColor(renderBounds.min.x, renderBounds.min.y + 20, renderBounds.max.x, renderBounds.max.y + 15, texture, PALETTE_RGB.ITEM_SHADOW);
                draw.texture(renderBounds.min.x, renderBounds.min.y, renderBounds.max.x, renderBounds.max.y, texture);
                matrices.model.pop();
            }
        }

        // overlay
        for (const { id } of poolItems) {
            const item = items.get(id);
            if (!item) {
                // Garbage collection: Remove reference if item no longer exists
                delete pool.items[id];
                continue;
            }
            if (states.held === item.id) continue;

            const renderState = await this.getItemRender(item);
            const childrenRender = await this.gatherChildrenItemRender(item);
            if (renderState.type === 'rendered' && childrenRender) {
                matrices.model.push();
                matrices.model.multiply(this.getWorldTransform(item).getMat4());
                await this.game.attribute.emit('renderOverlay', item, pool, renderState.render, childrenRender);
                matrices.model.pop();
            }
        }

        matrices.view.pop();
    }

    public async renderHeld() {
        const { states, items } = this.game.item;
        const { held } = states;
        if (!held) return;
        if (!this.renderPass) return;
        const item = items.get(held);
        if (!item) {
            states.held = undefined;
            return;
        }
        const pool = this.renderPass.pools[item.pool];
        if (!pool) {
            return;
        }
        const { matrices, draw } = this.game.pipeline;
        const renderState = await this.getItemRender(item);
        const childrenRender = await this.gatherChildrenItemRender(item);
        if (renderState.type === 'rendered' && childrenRender) {
            matrices.view.push();
            matrices.view.multiply(getTransform(pool.transform).getMat4());
            const { renderBounds, texture } = renderState.render;
            matrices.model.push();
            matrices.model.multiply(getTransform(item.transform).getMat4());
            draw.textureColor(renderBounds.min.x, renderBounds.min.y + 20, renderBounds.max.x, renderBounds.max.y + 15, texture, PALETTE_RGB.ITEM_SHADOW);
            draw.texture(renderBounds.min.x, renderBounds.min.y, renderBounds.max.x, renderBounds.max.y, texture);
            await this.game.attribute.emit('renderOverlay', item, pool.pool, renderState.render, childrenRender);
            matrices.model.pop();
            matrices.view.pop();
        }
    }

    public getWorldTransform(item: Item): Transform2D {
        let transform = getTransform(item.transform);
        let current = item;
        while (current.parent) {
            const parent = this.game.item.get(current.parent);
            if (!parent) break;
            transform = getTransform(parent.transform).multiply(transform);
            current = parent;
        }
        return transform;
    }

    public async getItemRender(item: Item): Promise<ItemRenderState> {
        // 1. Loading Check
        const tasks = await this.game.item.loadItem(item);
        if (tasks.length > 0) {
            return { type: 'loading', tasks, update: item.update };
        }

        // 2. Cache Check
        const existing = this.itemRender.get(item.id);
        if (existing && existing.update === item.update) {
            return existing;
        }

        // Pass 2: Render Children first
        const childrenRender = await this.gatherChildrenItemRender(item);
        if (!childrenRender) {
            throw new Error('Failed to gather children renders');
        }

        // 3. Render Fresh
        const render = existing?.type !== 'loading' && existing?.render || await this.createItemRender(item, childrenRender);

        render.bounds = await this.getItemBounds(item, childrenRender);
        render.renderBounds = await this.getItemRenderBounds(item, childrenRender);
        render.texture.use(() => {
            const dimensions = render.renderBounds.dimensions();
            render.texture.ensureSize(dimensions.x, dimensions.y);
        });

        // Mark as rendering (optimistic)
        const renderingState: ItemRenderState = { type: 'rendering', render, update: item.update };
        this.itemRender.set(item.id, renderingState);

        await this.renderItemToTarget(render, item, childrenRender);

        // Mark as rendered
        const renderedState: ItemRenderState = { type: 'rendered', render, update: item.update };
        this.itemRender.set(item.id, renderedState);

        return renderedState;
    }

    private async gatherChildrenItemRender(item: Item) {
        const { items } = this.game.item;
        const childrenRender: Record<string, ItemRender> = {};
        for (const id of item.children) {
            const data = items.get(id);
            if (!data) continue;

            const status = await this.getItemRender(data);
            if (status.type === 'rendered') {
                childrenRender[id] = status.render;
            } else {
                // If a child is not ready, we might want to abort or skip.
                // Current logic aborts the rest of the render.
                return;
            }
        }
        return childrenRender;
    }

    private async renderItemToTarget(render: ItemRender, item: Item, childrenRender: Record<string, ItemRender>): Promise<void> {
        const { renderBounds, target } = render;
        const { context, matrices } = this.game.pipeline;
        const dims = renderBounds.dimensions();

        // Pass 1: Pre-render
        await target.useAsync(async () => {
            context.stateManager.pushViewport(dims);
            await matrices.scopeAsync(async () => {
                matrices.identity();
                matrices.projection.orthographic(renderBounds.min.x, renderBounds.max.y, renderBounds.max.x, renderBounds.min.y, -1, 1);
                context.gl.clearColor(0, 0, 0, 0);
                context.gl.clear(context.gl.COLOR_BUFFER_BIT);
                await this.game.attribute.emit('renderPre', item, render);
            });
            context.stateManager.popViewport();
        });

        // Pass 3: Post-render (Composite)
        await target.useAsync(async () => {
            context.stateManager.pushViewport(dims);
            await matrices.scopeAsync(async () => {
                matrices.identity();
                matrices.view.identity();
                matrices.projection.orthographic(renderBounds.min.x, renderBounds.max.y, renderBounds.max.x, renderBounds.min.y, -1, 1);
                await this.game.attribute.emit('renderChildren', item, render, childrenRender);
                await this.game.attribute.emit('renderPost', item, render, childrenRender);
            });
            context.stateManager.popViewport();
        });
    }

    private async createItemRender(item: Item, childrenRender: Record<string, ItemRender>): Promise<ItemRender> {
        const { context } = this.game.pipeline;
        const bounds = await this.getItemBounds(item, childrenRender);
        const renderBounds = await this.getItemRenderBounds(item, childrenRender);
        const dimensions = renderBounds.dimensions();

        const texture = context.createTexture();
        texture.use(() => {
            texture.setImage(null, { width: dimensions.x, height: dimensions.y, internalFormat: 'rgba', format: 'rgba' });
            texture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
            texture.ensureSize(dimensions.x, dimensions.y);
        });

        const target = context.createFramebuffer();
        target.use(() => {
            target.attachTexture(texture);
        });

        return {
            bounds,
            renderBounds,
            target,
            texture,
            update: item.update,
        };
    }

    private async getItemBounds(item: Item, childrenRender: Record<string, ItemRender>): Promise<AABB2> {
        const result = { render: AABB2.ZEROONE };
        await this.game.attribute.emit('bounds', item, result, childrenRender);
        return result.render;
    }

    private async getItemRenderBounds(item: Item, childrenRender: Record<string, ItemRender>): Promise<AABB2> {
        const boundsResult = { render: AABB2.ZEROONE };
        await this.game.attribute.emit('bounds', item, boundsResult, childrenRender);
        let bounds = boundsResult.render;

        // 子アイテムの描画範囲も考慮する
        for (const childId of item.children) {
            const child = this.game.item.get(childId);
            if (!child) continue;
            const childRender = childrenRender[childId];
            if (childRender) {
                const childBounds = childRender.renderBounds;
                const mat = getTransform(child.transform).getMat4();
                const worldBounds = mat.transformAABB2(childBounds);
                bounds = bounds.union(worldBounds);
            }
        }

        return bounds;
    }
}

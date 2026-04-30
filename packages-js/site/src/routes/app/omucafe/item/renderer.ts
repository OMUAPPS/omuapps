import { AABB2 } from '$lib/math/aabb2';
import type { Transform2D } from '$lib/math/transform2d';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import { getTransform } from '../core/transform';
import type { ItemRender, ItemRenderState, RenderContext } from './attribute-handler';
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
        const { pipeline, item: itemManager, states, attribute, renderer } = this.game;
        const { draw, matrices } = pipeline;
        const itemStates = states.itemStates.value;
        const poolItems = Object.values(pool.items);

        // コンテキスト設定
        this.renderPass ??= { pools: {} };
        if (this.renderPass.pools[options.pool.id]) {
            throw new Error(`Pool with id ${options.pool.id} already exists.`);
        }
        this.renderPass.pools[options.pool.id] = options;

        matrices.view.push();
        matrices.view.multiply(getTransform(options.transform).getMat4());

        // 1回のみのループで処理できるようにフィルタリング
        const activeItems: Item[] = [];
        for (let i = 0; i < poolItems.length; i++) {
            const { id } = poolItems[i];
            const item = itemManager.items.get(id);

            if (!item || (item.pool !== pool.id)) {
                delete pool.items[id]; // 実際は描画ループ外でやるのが理想
                continue;
            }
            if (itemStates.held === item.id) continue;
            activeItems.push(item);
        }

        // --- Overlay Pre ---
        for (const item of activeItems) {
            const renderState = await this.getItemRender(item);
            const childrenRender = await this.gatherChildrenItemRender(item);
            if (renderState.type === 'rendered' && childrenRender) {
                matrices.model.push();
                matrices.model.multiply(this.getWorldTransform(item).getMat4());
                await attribute.emit('renderOverlayPre', item, pool, renderState.render, childrenRender);
                matrices.model.pop();
            }
        }

        // --- Main Render (Shadow & Texture) ---
        for (const item of activeItems) {
            if (item.parent) continue; // 親がいる場合は親の描画プロセスに含まれる

            const renderState = await this.getItemRender(item);
            if (renderState.type === 'rendered') {
                const { renderBounds, texture } = renderState.render;
                const transformMat = getTransform(item.transform).getMat4();

                // 画面外カリングの高速化
                const worldBounds = transformMat.transformAABB2(renderBounds);
                if (renderer.isInScreenSpace(worldBounds)) {
                    matrices.model.push();
                    matrices.model.multiply(transformMat);

                    // シャドウと本体を一気に描画
                    const { min, max } = renderBounds;
                    draw.textureColor(min.x, min.y + 20, max.x, max.y + 15, texture, PALETTE_RGB.ITEM_SHADOW);
                    draw.texture(min.x, min.y, max.x, max.y, texture);

                    matrices.model.pop();
                }
            }
        }

        // --- Overlay Post ---
        for (const item of activeItems) {
            const renderState = await this.getItemRender(item);
            const childrenRender = await this.gatherChildrenItemRender(item);
            if (renderState.type === 'rendered' && childrenRender) {
                matrices.model.push();
                matrices.model.multiply(this.getWorldTransform(item).getMat4());
                await attribute.emit('renderOverlayPost', item, pool, renderState.render, childrenRender);
                matrices.model.pop();
            }
        }

        matrices.view.pop();
    }

    public getPoolOptions(poolId: string): PoolOptions | undefined {
        return this.renderPass?.pools[poolId];
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
            await this.game.attribute.emit('renderOverlayPre', item, pool.pool, renderState.render, childrenRender);
            draw.textureColor(renderBounds.min.x, renderBounds.min.y + 20, renderBounds.max.x, renderBounds.max.y + 15, texture, PALETTE_RGB.ITEM_SHADOW);
            draw.texture(renderBounds.min.x, renderBounds.min.y, renderBounds.max.x, renderBounds.max.y, texture);
            await this.game.attribute.emit('renderOverlayPost', item, pool.pool, renderState.render, childrenRender);
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
        // 1. キャッシュチェック
        const existing = this.itemRender.get(item.id);
        if (existing && existing.update === item.update) return existing;

        const tasks = await this.game.item.loadItem(item);
        if (tasks.length > 0) return { type: 'loading', tasks, update: item.update };

        // 子要素のレンダー取得（再帰）
        const childrenRender = await this.gatherChildrenItemRender(item);
        if (!childrenRender) throw new Error('Failed to gather children renders');

        // 3. レンダリングリソースの準備
        let render: ItemRender;
        if (existing?.type !== 'loading' && existing?.render) {
            render = existing.render;
        } else {
            render = await this.createItemRender(item, childrenRender);
        }

        // 境界計算とテクスチャリサイズ（変更がある場合のみ）
        render.bounds = await this.getItemBounds(item, childrenRender);
        const newRenderBounds = await this.getItemRenderBounds(item, childrenRender);

        // 境界サイズが変わった場合のみテクスチャを再確保
        if (!render.renderBounds.equals(newRenderBounds)) {
            render.renderBounds = newRenderBounds;
            const dims = render.renderBounds.dimensions();
            render.texture.use(() => {
                render.texture.ensureSize(dims.x, dims.y);
            });
        }

        const renderingState: ItemRenderState = { type: 'rendering', render, update: item.update };
        this.itemRender.set(item.id, renderingState);

        // WebGL描画命令（シリアル実行）
        await this.renderItemToTarget(render, item, childrenRender);

        const renderedState: ItemRenderState = { type: 'rendered', render, update: item.update };
        this.itemRender.set(item.id, renderedState);
        return renderedState;
    }

    public async deleteItemRender(id: string) {
        const renderState = this.itemRender.get(id);
        if (renderState?.type === 'rendered') {
            renderState.render.texture.delete();
            renderState.render.target.delete();
        }
        this.itemRender.delete(id);
    }

    private async gatherChildrenItemRender(item: Item): Promise<Record<string, ItemRender> | undefined> {
        if (item.children.length === 0) return {};

        const childrenRender: Record<string, ItemRender> = {};
        // 子アイテムの読み込み（ここは非同期で一気に投げる）
        // WebGL命令が含まれるため、getItemRender内部の順序は守る必要がある
        for (const id of item.children) {
            const child = this.game.item.get(id);
            if (!child) continue;

            const status = await this.getItemRender(child);
            if (status.type === 'rendered') {
                childrenRender[id] = status.render;
            } else {
                return undefined; // 準備未完了
            }
        }
        return childrenRender;
    }

    private async renderItemToTarget(render: ItemRender, item: Item, children: Record<string, ItemRender>): Promise<void> {
        const { renderBounds, target } = render;
        const { context, matrices } = this.game.pipeline;
        const dims = renderBounds.dimensions();
        const { gl, stateManager } = context;

        // FBOのバインド回数を減らすため、パスを整理
        await target.useAsync(async () => {
            stateManager.pushViewport(dims);

            // Pass 1: Clear & Pre-render
            await matrices.scopeAsync(async () => {
                matrices.identity();
                matrices.projection.orthographic(renderBounds.min.x, renderBounds.max.y, renderBounds.max.x, renderBounds.min.y, -1, 1);

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                const ctx: RenderContext = {
                    render,
                    children,
                    passes: [],
                };
                await this.game.attribute.emit('getRenderPass', item, ctx);
                const sortedPasses = ctx.passes.sort((a, b) => a.order - b.order);
                for (const pass of sortedPasses) {
                    await pass.render();
                }
            });

            stateManager.popViewport();
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

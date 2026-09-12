import type { GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import type { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import { type Vec4Like } from '$lib/math/vec4';
import type { AssetTransform } from '../core/game-renderer';
import { RenderTarget, RenderTargetPool } from './render-target';
import { PALETTE_RGB } from '../colors';
import type { Game } from '../core/game';
import { getTransform } from '../core/transform';
import type { ItemBounds, ItemDrawContext, ItemBoundsState } from './attribute-handler';
import type { Item, ItemPool, PoolOptions } from './item';

export interface PoolRenderPass {
    pools: Record<string, PoolOptions>;
}

export class ItemRenderer {
    public renderPass: PoolRenderPass | undefined;
    public renderPassStack: PoolRenderPass[] = [];
    private readonly targets: RenderTargetPool;
    private readonly thumbnails = new Map<string, { item: Item; update: number; size: number; target: RenderTarget; render: ItemBounds & { texture: GlTexture } }>();

    constructor(
        private readonly game: Game,
    ) {
        this.targets = new RenderTargetPool(game.pipeline.context);
    }

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

    public async renderPool(pool: ItemPool, options: PoolOptions): Promise<void> {
        const { pipeline: { matrices }, item: itemManager, renderer } = this.game;
        this.addPool(options);
        const activeItems: Item[] = [];
        for (const { id } of Object.values(pool.items)) {
            const item = itemManager.get(id);
            if (!item || item.pool !== pool.id) {
                delete pool.items[id];
                continue;
            }
            if (itemManager.states.held !== item.id) activeItems.push(item);
        }
        matrices.view.push();
        try {
            matrices.view.multiply(getTransform(options.transform).getMat4());
            for (const item of activeItems) await this.drawOverlay('renderOverlayPre', item, pool);
            for (const item of activeItems) {
                if (item.parent) continue;
                const result = await this.getItemBounds(item);
                if (result.type !== 'rendered') continue;
                const { renderBounds } = result.render;
                const transform = getTransform(item.transform).getMat4();
                // Include the shadow so an offscreen body can still cast onto the output.
                const visibleBounds = renderBounds.union(new AABB2(
                    renderBounds.min.add(new Vec2(0, 20)), renderBounds.max.add(new Vec2(0, 20)),
                ));
                if (!renderer.isInScreenSpace(transform.transformAABB2(visibleBounds))) continue;
                matrices.model.push();
                try {
                    matrices.model.multiply(transform);
                    await this.drawShadow(item, renderBounds);
                    await this.drawItem(item);
                } finally {
                    matrices.model.pop();
                }
            }
            for (const item of activeItems) await this.drawOverlay('renderOverlayPost', item, pool);
        } finally {
            matrices.view.pop();
        }
    }

    private async drawOverlay(phase: 'renderOverlayPre' | 'renderOverlayPost', item: Item, pool: ItemPool): Promise<void> {
        const result = await this.getItemBounds(item);
        if (result.type !== 'rendered') return;
        const children = await this.gatherChildrenBounds(item);
        if (!children) return;
        const { model } = this.game.pipeline.matrices;
        model.push();
        try {
            model.multiply(this.getWorldTransform(item).getMat4());
            await this.game.attribute.emit(phase, item, pool, result.render, children);
        } finally {
            model.pop();
        }
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
        const { matrices } = this.game.pipeline;
        const renderState = await this.getItemBounds(item);
        const childrenRender = await this.gatherChildrenBounds(item);
        if (renderState.type === 'rendered' && childrenRender) {
            matrices.push();
            try {
                matrices.view.multiply(getTransform(pool.transform).getMat4());
                matrices.model.multiply(getTransform(item.transform).getMat4());
                await this.game.attribute.emit('renderOverlayPre', item, pool.pool, renderState.render, childrenRender);
                await this.drawShadow(item, renderState.render.renderBounds);
                await this.drawItem(item);
                await this.game.attribute.emit('renderOverlayPost', item, pool.pool, renderState.render, childrenRender);
            } finally {
                matrices.pop();
            }
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

    /** Geometry only: calling this never allocates a composite texture. */
    public async getItemBounds(item: Item): Promise<ItemBoundsState> {
        const tasks = await this.game.item.loadItem(item);
        if (tasks.length) return { type: 'loading', tasks, update: item.update };
        const children = await this.gatherChildrenBounds(item);
        if (!children) return { type: 'loading', tasks: [], update: item.update };
        const result = { render: AABB2.ZEROONE };
        await this.game.attribute.emit('bounds', item, result, children);
        let renderBounds = result.render;
        for (const [id, render] of Object.entries(children)) {
            const child = this.game.item.get(id);
            if (child) renderBounds = renderBounds.union(getTransform(child.transform).getMat4().transformAABB2(render.renderBounds));
        }
        return { type: 'rendered', update: item.update, render: { update: item.update, bounds: result.render, renderBounds } };
    }

    private async gatherChildrenBounds(item: Item): Promise<Record<string, ItemBounds> | undefined> {
        const children: Record<string, ItemBounds> = {};
        for (const id of item.children) {
            const child = this.game.item.get(id);
            if (!child) continue;
            const result = await this.getItemBounds(child);
            if (result.type !== 'rendered') return;
            children[id] = result.render;
        }
        return children;
    }

    /** The current model matrix already includes this item's transform. */
    public async drawItem(item: Item): Promise<void> {
        if ((await this.game.item.loadItem(item)).length) return;
        const ctx: ItemDrawContext = { passes: [] };
        await this.game.attribute.emit('getRenderPass', item, ctx);
        for (const pass of ctx.passes.sort((a, b) => a.order - b.order)) await pass.render();
    }

    public async drawChildren(item: Item): Promise<void> {
        const { model } = this.game.pipeline.matrices;
        for (const id of item.children) {
            const child = this.game.item.get(id);
            if (!child) continue;
            model.push();
            try {
                model.multiply(getTransform(child.transform).getMat4());
                await this.drawItem(child);
            } finally {
                model.pop();
            }
        }
    }

    /** Capture at the current output's pixel density, including offscreen effect padding. */
    private async capture(
        render: () => Promise<void>,
        consume: (texture: GlTexture, bounds: AABB2) => Promise<void>,
        padding = 0,
    ): Promise<void> {
        const { context, matrices } = this.game.pipeline;
        const { gl, stateManager } = context;
        const viewport = stateManager.viewport;
        const size = new Vec2(viewport.x + padding * 2, viewport.y + padding * 2);
        if (viewport.x <= 0 || viewport.y <= 0) return;
        await this.targets.use(size, async target => {
            await target.framebuffer.useAsync(async () => {
                stateManager.pushViewport(size);
                matrices.projection.push();
                const scissor = gl.isEnabled(gl.SCISSOR_TEST);
                try {
                    gl.disable(gl.SCISSOR_TEST);
                    const projection = matrices.projection.get();
                    matrices.projection.identity();
                    matrices.projection.scale(viewport.x / size.x, viewport.y / size.y, 1);
                    matrices.projection.multiply(projection);
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    await render();
                } finally {
                    if (scissor) gl.enable(gl.SCISSOR_TEST);
                    matrices.projection.pop();
                    stateManager.popViewport();
                }
            });
            await consume(target.texture, new AABB2(
                new Vec2(-size.x / viewport.x, -size.y / viewport.y),
                new Vec2(size.x / viewport.x, size.y / viewport.y),
            ));
        });
    }

    private inClipSpace(draw: () => void): void {
        const { matrices } = this.game.pipeline;
        matrices.push();
        try {
            matrices.identity();
            draw();
        } finally {
            matrices.pop();
        }
    }

    public async drawMasked(render: () => Promise<void>, mask: AssetTransform, inverted = false): Promise<void> {
        const { draw, context: { gl } } = this.game.pipeline;
        // Apply the mask once to the assembled group, preserving overlapping translucent children.
        await this.capture(render, async (content, bounds) => {
            await this.capture(async () => {
                if (inverted) {
                    gl.clearColor(1, 1, 1, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
                }
                try {
                    await this.game.renderer.drawAssetTransform(mask);
                } finally {
                    if (inverted) this.game.renderer.resetBlending();
                }
            }, async maskTexture => {
                this.inClipSpace(() => draw.textureMask(...bounds.toArray(), content, maskTexture));
            });
        });
    }

    public async drawItemOverlay(item: Item, color: Vec4Like): Promise<void> {
        await this.capture(() => this.drawItem(item), async (texture, bounds) => {
            this.inClipSpace(() => this.game.pipeline.draw.texture(...bounds.toArray(), texture, color));
        });
    }

    public async drawItemOutline(item: Item, color: Vec4Like, width: number): Promise<void> {
        if (width <= 0) return;
        await this.capture(() => this.drawItem(item), async (texture, bounds) => {
            this.inClipSpace(() => this.game.pipeline.draw.textureOutline(...bounds.toArray(), texture, color, width, null, true));
        }, Math.ceil(width) + 1);
    }

    private async drawShadow(item: Item, bounds: AABB2): Promise<void> {
        const { model } = this.game.pipeline.matrices;
        model.push();
        try {
            model.translate(0, bounds.min.y + 20, 0);
            model.scale(1, Math.max(0, bounds.height - 5) / Math.max(1, bounds.height), 1);
            model.translate(0, -bounds.min.y, 0);
            await this.capture(() => this.drawItem(item), async (texture, screenBounds) => {
                this.inClipSpace(() => this.game.pipeline.draw.textureColor(...screenBounds.toArray(), texture, PALETTE_RGB.ITEM_SHADOW));
            });
        } finally {
            model.pop();
        }
    }

    /** Bounded cache for UI previews only; gameplay never samples these textures. */
    public async renderItemThumbnail(item: Item, { size = 256 }: { size?: number } = {}): Promise<
        { type: 'loading' } | { type: 'rendered'; render: ItemBounds & { texture: GlTexture } }
    > {
        size = Math.max(1, Math.min(1024, Math.round(size)));
        const existing = this.thumbnails.get(item.id);
        if (existing?.item === item && existing.update === item.update && existing.size === size) {
            this.thumbnails.delete(item.id);
            this.thumbnails.set(item.id, existing);
            return { type: 'rendered', render: existing.render };
        }
        const update = item.update;
        const result = await this.getItemBounds(item);
        if (result.type !== 'rendered') return { type: 'loading' };
        this.deleteItemThumbnail(item.id);
        let { renderBounds } = result.render;
        const { context, matrices } = this.game.pipeline;
        const { gl, stateManager } = context;
        const target = new RenderTarget(context, Vec2.ONE);
        try {
            // First locate the visible content, then redraw from source at the full thumbnail resolution.
            for (let pass = 0; pass < 2; pass++) {
                const scale = size / Math.max(1, renderBounds.width, renderBounds.height);
                const dimensions = new Vec2(Math.max(1, Math.ceil(renderBounds.width * scale)), Math.max(1, Math.ceil(renderBounds.height * scale)));
                target.resize(dimensions);
                let contentBounds = renderBounds;
                await target.framebuffer.useAsync(async () => {
                    stateManager.pushViewport(dimensions);
                    matrices.push();
                    const scissor = gl.isEnabled(gl.SCISSOR_TEST);
                    try {
                        gl.disable(gl.SCISSOR_TEST);
                        matrices.identity();
                        // FBO row zero maps to the top of the item for UI sampling and PNG readback.
                        matrices.projection.orthographic(renderBounds.min.x, renderBounds.max.y, renderBounds.max.x, renderBounds.min.y, -1, 1);
                        gl.clearColor(0, 0, 0, 0);
                        gl.clear(gl.COLOR_BUFFER_BIT);
                        await this.drawItem(item);
                        if (pass === 0) contentBounds = this.getThumbnailContentBounds(target, renderBounds);
                    } finally {
                        if (scissor) gl.enable(gl.SCISSOR_TEST);
                        matrices.pop();
                        stateManager.popViewport();
                    }
                });
                if (contentBounds.equals(renderBounds)) break;
                renderBounds = contentBounds;
            }
        } catch (error) {
            target.delete();
            throw error;
        }
        const render = { ...result.render, renderBounds, texture: target.texture };
        this.thumbnails.set(item.id, { item, update, size, target, render });
        if (this.thumbnails.size > 32) this.deleteItemThumbnail(this.thumbnails.keys().next().value!);
        return { type: 'rendered', render };
    }

    private getThumbnailContentBounds(target: RenderTarget, bounds: AABB2): AABB2 {
        const { width, height } = target.texture;
        const pixels = target.framebuffer.readPixels(0, 0, width, height, 'rgba');
        let left = width;
        let top = height;
        let right = 0;
        let bottom = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (pixels[(y * width + x) * 4 + 3] === 0) continue;
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x + 1);
                bottom = Math.max(bottom, y + 1);
            }
        }
        if (right <= left || bottom <= top) return bounds;
        return new AABB2(
            bounds.at({ x: left / width, y: top / height }),
            bounds.at({ x: right / width, y: bottom / height }),
        );
    }

    public dispose(): void {
        for (const id of this.thumbnails.keys()) this.deleteItemThumbnail(id);
        this.targets.dispose();
    }

    public deleteItemThumbnail(id: string): void {
        this.thumbnails.get(id)?.target.delete();
        this.thumbnails.delete(id);
    }
}

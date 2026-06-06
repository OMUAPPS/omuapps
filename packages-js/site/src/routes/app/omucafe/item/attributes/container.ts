import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4, type Vec4Like } from '$lib/math/vec4';
import { PALETTE_RGB } from '../../colors';
import { getAssetKey } from '../../core/asset';
import type { Game } from '../../core/game';
import { validateAssetTransform, type AssetTransform } from '../../core/game-renderer';
import { validateEnum, type ValidateResult } from '../../core/helper';
import type { Action } from '../../core/input-system';
import { getTransform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, CalculateBoundsContext, HashContext, ItemMouseEvent, ItemRender, ItemRenderContext, LoadContext } from '../attribute-handler';
import type { Item, ItemPool } from '../item';
import ContainerEditor from './ContainerEditor.svelte';

export interface AttrContainer {
    active: boolean;
    cover?: AssetTransform;
    mask?: AssetTransform;
    maskInverted?: boolean;
    layerOrder: 'upper' | 'lower';
    orderingAnchor: 'top' | 'center' | 'bottom';
    dropShadow?: {
        distance: number;
    };
    constraints?: {
        maxItems?: number;
        tags?: string[];
        noOverflow?: boolean;
        bounds?: {
            horizontal: 'left' | 'right' | 'both' | 'none';
            vertical: 'top' | 'bottom' | 'both' | 'none';
            padding: {
                left: number;
                right: number;
                top: number;
                bottom: number;
            };
        };
    };
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    readonly name = '上に乗せられる';
    readonly editor = ContainerEditor;
    private readonly maskBuffer: GlFramebuffer;
    private readonly maskTexture: GlTexture;
    private readonly childrenBuffer: GlFramebuffer;
    private readonly childrenTexture: GlTexture;

    constructor(private readonly game: Game) {
        const { context } = game.pipeline;
        this.maskBuffer = context.createFramebuffer();
        this.maskTexture = context.createTexture();
        this.maskTexture.use(() => {
            this.maskTexture.setImage(null, {
                width: 4,
                height: 4,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.maskTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.maskBuffer.use(() => {
            this.maskBuffer.attachTexture(this.maskTexture);
        });

        this.childrenBuffer = context.createFramebuffer();
        this.childrenTexture = context.createTexture();
        this.childrenTexture.use(() => {
            this.childrenTexture.setImage(null, {
                width: 4,
                height: 4,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            this.childrenTexture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        this.childrenBuffer.use(() => {
            this.childrenBuffer.attachTexture(this.childrenTexture);
        });
    }

    create(): AttrContainer {
        return {
            active: true,
            layerOrder: 'lower',
            orderingAnchor: 'center',
        };
    }

    validate(value: AttrContainer): ValidateResult<AttrContainer> {
        if (value.cover) {
            const coverResult = validateAssetTransform(value.cover);
            if (coverResult.type === 'invalid') {
                return { type: 'invalid', message: `coverが無効: ${coverResult.message}` };
            }
        }
        if (value.mask) {
            const maskResult = validateAssetTransform(value.mask);
            if (maskResult.type === 'invalid') {
                return { type: 'invalid', message: `maskが無効: ${maskResult.message}` };
            }
        }

        if (value.constraints) {
            if (value.constraints.maxItems !== undefined) {
                if (typeof value.constraints.maxItems !== 'number' || value.constraints.maxItems < 0) {
                    return { type: 'invalid', message: 'constraints.maxItemsは0以上の数値でなければなりません' };
                }
            }
            if (value.constraints.tags) {
                if (!Array.isArray(value.constraints.tags) || !value.constraints.tags.every(tag => typeof tag === 'string')) {
                    return { type: 'invalid', message: 'constraints.tagsは文字列の配列でなければなりません' };
                }
            }
            if (value.constraints.bounds) {
                const { horizontal, vertical } = value.constraints.bounds;
                const horizontalResult = validateEnum(horizontal, ['left', 'right', 'both', 'none']);
                if (horizontalResult.type === 'invalid') {
                    return { type: 'invalid', message: `無効な水平拘束: ${horizontal}` };
                }
                const verticalResult = validateEnum(vertical, ['top', 'bottom', 'both', 'none']);
                if (verticalResult.type === 'invalid') {
                    return { type: 'invalid', message: `無効な垂直拘束: ${vertical}` };
                }
                if (!value.constraints.bounds.padding) {
                    value.constraints.bounds.padding = {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                    };
                }
            }
        }

        const layerOrderResult = validateEnum(value.layerOrder, ['upper-top', 'upper-center', 'upper-bottom', 'lower-top', 'lower-center', 'lower-bottom']);
        if (layerOrderResult.type === 'invalid') {
            return { type: 'invalid', message: `layerOrderが無効: ${value.layerOrder}` };
        }
        return { type: 'valid', value: value };
    }

    async hash(invoke: AttributeInvoke<AttrContainer>, ctx: HashContext): Promise<void> {
        ctx.hash += `container:${JSON.stringify(invoke.attr)}`;
    }

    /** * 蓋（カバー）用テクスチャの事前ロード
     */
    async load({ attr }: AttributeInvoke<AttrContainer>, ctx: LoadContext): Promise<void> {
        if (attr.cover) {
            const assetState = this.game.asset.getTexture(attr.cover.asset);
            if (assetState.type !== 'ready') {
                const task = ctx.create({ title: `テクスチャ読込中: ${getAssetKey(attr.cover.asset)}` });
                assetState.promise.then(() => {
                    task.resolve();
                });
            }
        }

        if (attr.mask) {
            const maskState = this.game.asset.getTexture(attr.mask.asset);
            if (maskState.type !== 'ready') {
                const task = ctx.create({ title: `テクスチャ読込中: ${getAssetKey(attr.mask.asset)}` });
                maskState.promise.then(() => {
                    task.resolve();
                });
            }
        }
    }

    /** * 子要素を含めた全体の描画範囲を計算
     */
    async bounds({ attr }: AttributeInvoke<AttrContainer>, ctx: CalculateBoundsContext): Promise<void> {
        const { cover } = attr;
        if (cover) {
            const textureState = this.game.asset.getTexture(cover.asset);
            if (textureState.type === 'ready') {
                const { width, height } = textureState.data.texture;
                const bounds = new AABB2(
                    new Vec2(-width / 2, -height / 2),
                    new Vec2(width / 2, height / 2),
                );
                const mat = getTransform(cover.transform).getMat4();
                ctx.render = ctx.render.union(mat.transformAABB2(bounds));
            }
        }
    }

    /** * コンテナ自体のカバーやデバッグ情報の描画
     */
    async renderOverlayPost({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { matrices, draw } = this.game.pipeline;
        const scene = this.game.states.scene.value;
        const { states } = this.game.item;
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const heldItem = states.held && this.game.item.get(states.held);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        if (isHovered && heldItem && await this.isItemWithinLimits(item, render, attr, heldItem) && this.game.input.current?.id.includes(item.id)) {
            const { min, max } = render.renderBounds;
            const { texture } = render;

            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.CONTAINER_HOVERED, 4);
        }

        if (isHovered && this.game.side === 'client') {
            const { draw, matrices } = this.game.pipeline;

            for (const [id, renderData] of Object.entries(children)) {
                const child = this.game.item.items.get(id);
                if (!child) continue;

                matrices.model.scope(() => {
                    matrices.model.multiply(getTransform(child.transform).getMat4());
                    draw.texture(
                        renderData.renderBounds.min.x, renderData.renderBounds.min.y,
                        renderData.renderBounds.max.x, renderData.renderBounds.max.y,
                        renderData.texture,
                        Vec4.ONE.with({ w: child.id === states.hovered ? 0.5 : 0.1 }),
                    );
                });
            }
        }
        const { mask } = attr;
        if (mask && scene.type === 'factory' && scene.selecting?.type === 'edit_item' && scene.selecting.itemId === item.id) {
            const textureState = this.game.asset.getTexture(mask.asset);
            if (textureState.type !== 'ready') return;
            const tex = textureState.data.texture;
            const halfSize = new Vec2(tex.width / 2, tex.height / 2);

            // 中心基準の描画範囲
            const bounds = new AABB2(halfSize.scale(-1), halfSize);
            const mat = getTransform(mask.transform).getMat4();

            matrices.model.scope(() => {
                matrices.model.multiply(mat);
                draw.texture(...bounds.toArray(), tex, Vec4.ONE.with({ w: 0.2 }));
            });
        }
    }

    async getRenderPass(invoke: AttributeInvoke<AttrContainer>, ctx: ItemRenderContext): Promise<void> {
        const { attr, item } = invoke;
        if (attr.cover) {
            ctx.passes.push({
                order: 2000,
                render: async () => {
                    await this.renderPost(attr);
                },
            });
        }
        if (item.children.length) {
            ctx.passes.push({
                order: 1000,
                render: async () => {
                    this.renderChildren(attr, ctx.render, ctx.children);
                },
            });
        }
    }

    async renderPost(attr: AttrContainer): Promise<void> {
        const { cover } = attr;
        if (cover) {
            await this.game.renderer.drawAssetTransform(cover);
        }
    }

    /** * 子要素の描画（各子のトランスフォームを適用）
     */
    async renderChildren(attr: AttrContainer, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { mask } = attr;
        if (!mask) {
            this.renderChildrenToTarget(children, Vec4.ONE);
            return;
        }
        const textureState = this.game.asset.getTexture(mask.asset);
        if (textureState.type !== 'ready') return;
        const { context, draw } = this.game.pipeline;
        const { gl } = context;

        // マスクの準備
        this.maskTexture.use(() => {
            this.maskTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        await this.maskBuffer.useAsync(async () => {
            const inverted = attr.maskInverted;
            if (inverted) {
                gl.clearColor(1, 1, 1, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                // Sub blending
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_COLOR);
            } else {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }

            await this.game.renderer.drawAssetTransform(mask);

            if (inverted) {
                this.game.renderer.resetBlending();
            }
        });

        // 子アイテムの書き出し
        this.childrenTexture.use(() => {
            this.childrenTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        this.childrenBuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.renderChildrenToTarget(children, Vec4.ONE);
        });

        draw.textureMask(...render.renderBounds.toArray(), this.childrenTexture, this.maskTexture);
    }

    private renderChildrenToTarget(children: Record<string, ItemRender>, color: Vec4Like) {
        const { draw, matrices } = this.game.pipeline;

        for (const [id, renderData] of Object.entries(children)) {
            const child = this.game.item.items.get(id);
            if (!child) continue;

            matrices.model.scope(() => {
                matrices.model.multiply(getTransform(child.transform).getMat4());
                draw.texture(
                    renderData.renderBounds.min.x, renderData.renderBounds.min.y,
                    renderData.renderBounds.max.x, renderData.renderBounds.max.y,
                    renderData.texture,
                    color,
                );
            });
        }
    }

    /** * 他のアイテムをコンテナに入れるアクション
     */
    async actions({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, _event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void> {
        if (!attr.active) return;

        const { states } = this.game.item;
        if (!states.held) return;

        const scene = this.game.states.scene.value;

        if (pool.id !== 'fridge' && scene.type === 'factory' && this.game.fridge.hovered) {
            return;
        }

        // ホバーされているのが自分自身、または自分の子供かどうかを確認
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        const heldItem = this.game.item.items.get(states.held);
        if (!heldItem) return;
        const renderResult = await this.game.itemRenderer.getItemRender(item);
        if (renderResult.type !== 'rendered') return;

        if (isHovered && await this.isItemWithinLimits(item, renderResult.render, attr, heldItem)) {
            if (pool.id === 'fridge' && heldItem.pool !== 'fridge' && scene.type !== 'factory') {
                return;
            }
            ctx.actions.push({
                title: `${item.name}に乗せる`,
                id: `container-${item.id}`,
                priority: item.pool === 'fridge' ? 400 : 300,
                invoke: async () => {
                    this.game.item.dropItem();
                    this.game.item.attachItem(item, heldItem);
                    await this.reorderChildren(item, attr);
                    await this.constrainItemToBounds(attr, item, heldItem);
                    this.game.item.updateItem(item);
                },
            });
        }
    }

    private async isItemWithinLimits(item: Item, render: ItemRender, attr: AttrContainer, child: Item): Promise<boolean> {
        const { constraints } = attr;
        if (!constraints) return true;
        // アイテム数制約の確認
        if (constraints.maxItems !== undefined && item.children.length >= constraints.maxItems) {
            return false;
        }
        // タグ制約の確認
        if (constraints.tags && constraints.tags.length > 0) {
            const childTags = new Set(child.tags);
            if (!constraints.tags.some(tag => childTags.has(tag))) {
                return false;
            }
        }
        // 境界制約の確認
        if (constraints.bounds) {
            const bounds = render.bounds;
            const containerBounds = new AABB2(
                new Vec2(bounds.min.x + constraints.bounds.padding.left, bounds.min.y + constraints.bounds.padding.top),
                new Vec2(bounds.max.x - constraints.bounds.padding.right, bounds.max.y - constraints.bounds.padding.bottom),
            );

            const childRender = await this.game.itemRenderer.getItemRender(child);
            if (childRender.type !== 'rendered') return true;
            const childBounds = childRender.render.bounds;

            const dimensions = containerBounds.size;
            const size = childBounds.size;
            const sizeExceded = dimensions.x < size.x || dimensions.y < size.y;

            if (sizeExceded && constraints.noOverflow) {
                return false;
            }
        }
        return true;
    }

    /**
     * アイテムをプールの境界内に収めるための座標計算を行います。
     */
    private async constrainItemToBounds(attr: AttrContainer, container: Item, child: Item) {
        if (!attr.constraints?.bounds) return;
        const containerRender = await this.game.itemRenderer.getItemRender(container);
        if (containerRender.type !== 'rendered') return;

        const bounds = containerRender.render.bounds;
        const containerBounds = new AABB2(
            new Vec2(bounds.min.x + attr.constraints.bounds.padding.left, bounds.min.y + attr.constraints.bounds.padding.top),
            new Vec2(bounds.max.x - attr.constraints.bounds.padding.right, bounds.max.y - attr.constraints.bounds.padding.bottom),
        );

        const childRender = await this.game.itemRenderer.getItemRender(child);
        if (childRender.type !== 'rendered') return;
        const childBounds = childRender.render.bounds;

        const dimensions = containerBounds.size;
        const size = childBounds.size;

        const exceededLeft = containerBounds.min.x - childBounds.min.x - child.transform.offset.x;
        const exceededRight = childBounds.max.x + child.transform.offset.x - containerBounds.max.x;
        const exceededTop = containerBounds.min.y - childBounds.min.y - child.transform.offset.y;
        const exceededBottom = childBounds.max.y + child.transform.offset.y - containerBounds.max.y;
        const constraint = attr.constraints.bounds;

        if (dimensions.x < size.x) {
            const newX = lerp(containerBounds.min.x - childBounds.min.x, containerBounds.max.x - childBounds.max.x, 0.5);
            const deltaX = newX - child.transform.offset.x;
            if (deltaX > 0) {
                if (constraint.horizontal !== 'right') child.transform.offset.x += deltaX;
            } else {
                if (constraint.horizontal !== 'left') child.transform.offset.x += deltaX;
            }
        } else {
            if (exceededLeft > 0 && constraint.horizontal !== 'right') child.transform.offset.x += exceededLeft;
            if (exceededRight > 0 && constraint.horizontal !== 'left') child.transform.offset.x -= exceededRight;
        }

        if (dimensions.y < size.y) {
            const newY = lerp(containerBounds.min.y - childBounds.min.y, containerBounds.max.y - childBounds.max.y, 0.5);
            const deltaY = newY - child.transform.offset.y;
            if (deltaY > 0) {
                if (constraint.vertical !== 'bottom') child.transform.offset.y += deltaY;
            } else {
                if (constraint.vertical !== 'top') child.transform.offset.y += deltaY;
            }
        } else {
            if (exceededTop > 0 && constraint.vertical !== 'bottom') child.transform.offset.y += exceededTop;
            if (exceededBottom > 0 && constraint.vertical !== 'top') child.transform.offset.y -= exceededBottom;
        }
    }

    private async reorderChildren(item: Item, attr: AttrContainer) {
        const children = item.children
            .map(id => this.game.item.items.get(id))
            .filter((child): child is Item => !!child);

        const renderData: Record<string, ItemRender> = {};
        for (const child of children) {
            const renderState = await this.game.itemRenderer.getItemRender(child);
            if (renderState.type === 'rendered') {
                renderData[child.id] = renderState.render;
            }
        }

        const anchorYLevel = attr.orderingAnchor === 'top' ? 0 : attr.orderingAnchor === 'bottom' ? 1 : 0.5;

        children.sort((a, b) => {
            const aBounds = renderData[a.id]?.bounds;
            const bBounds = renderData[b.id]?.bounds;

            if (!aBounds || !bBounds) return 0; // 描画データがない場合は順序を変えない

            const aCenterY = a.transform.offset.y + lerp(aBounds.min.y, aBounds.max.y, anchorYLevel);
            const bCenterY = b.transform.offset.y + lerp(bBounds.min.y, bBounds.max.y, anchorYLevel);

            const delta = (bCenterY - aCenterY);
            return attr.layerOrder === 'upper' ? delta : -delta;
        });

        item.children = children.map(child => child.id);
    }
}

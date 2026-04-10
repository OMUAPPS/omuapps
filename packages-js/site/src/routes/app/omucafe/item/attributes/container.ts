import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import { getAssetKey, validateAsset, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { ValidateResult } from '../../core/helper';
import type { Action } from '../../core/input-system';
import { getTransform, validateTransform, type Transform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, CalculateBoundsContext, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { Item, ItemPool } from '../item';
import ContainerEditor from './ContainerEditor.svelte';

export interface AttrContainer {
    active: boolean;
    cover?: {
        asset: Asset;
        transform: Transform;
    };
    mask?: {
        asset: Asset;
        transform: Transform;
    };
    layerOrder: 'upper' | 'lower';
    constraints?: {
        maxItems?: number;
        tags?: string[];
        bounds?: {
            horizontal: 'left' | 'right' | 'both' | 'none';
            vertical: 'top' | 'bottom' | 'both' | 'none';
        };
    };
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    readonly name = '容器';
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
            constraints: {
                bounds: {
                    horizontal: 'both',
                    vertical: 'bottom',
                },
            },
        };
    }

    validate(value: AttrContainer): ValidateResult<AttrContainer> {
        if (value.cover) {
            if (!value.cover.asset) {
                return { type: 'invalid', message: 'カバーのアセットが指定されていません' };
            }
            if (value.cover.transform) {
                const transformResult = validateTransform(value.cover.transform);
                if (transformResult.type === 'invalid') {
                    return { type: 'invalid', message: `カバーのトランスフォームが無効: ${transformResult.message}` };
                }
            }
            const assetResult = validateAsset(value.cover.asset);
            if (assetResult.type === 'invalid') {
                return { type: 'invalid', message: `カバーのアセットが無効: ${assetResult.message}` };
            }

            const assetState = this.game.asset.getTexture(value.cover.asset);
            if (assetState.type === 'error') {
                return { type: 'invalid', message: `テクスチャの読み込みに失敗: ${getAssetKey(value.cover.asset)}` };
            }
        }
        if (value.layerOrder !== 'upper' && value.layerOrder !== 'lower') {
            return { type: 'invalid', message: `無効なレイヤー順序: ${value.layerOrder}` };
        }
        return { type: 'valid', value: value };
    }

    /** * 蓋（カバー）用テクスチャの事前ロード
     */
    async load({ attr }: AttributeInvoke<AttrContainer>, ctx: LoadContext): Promise<void> {
        if (attr.cover) {
            const assetState = this.game.asset.getTexture(attr.cover.asset);
            if (assetState.type !== 'ready') {
                const task = ctx.create({ title: `テクスチャ読込中: ${getAssetKey(attr.cover.asset)}` });
                await assetState.promise;
                task.resolve();
            }
        }

        if (attr.mask) {
            const maskState = this.game.asset.getTexture(attr.mask.asset);
            if (maskState.type !== 'ready') {
                const task = ctx.create({ title: `テクスチャ読込中: ${getAssetKey(attr.mask.asset)}` });
                await maskState.promise;
                task.resolve();
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
    async renderOverlay({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { matrices, draw } = this.game.pipeline;

        const { states } = this.game.item;
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        if (isHovered && states.held && !this.isItemCountLimited(item, attr)) {
            const { min, max } = render.renderBounds;
            const { texture } = render;

            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.CONTAINER_HOVERED, 4);
        }
    }

    async renderPost({ attr, item }: AttributeInvoke<AttrContainer>, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;
        const { cover } = attr;
        if (cover) {
            const textureState = this.game.asset.getTexture(cover.asset);
            if (textureState.type !== 'ready') return;

            const tex = textureState.data.texture;
            const halfSize = new Vec2(tex.width / 2, tex.height / 2);

            // 中心基準の描画範囲
            const bounds = new AABB2(halfSize.scale(-1), halfSize);
            const mat = getTransform(cover.transform).getMat4();

            matrices.model.scope(() => {
                matrices.model.multiply(mat);
                draw.texture(...bounds.toArray(), tex);
            });
        }
    }

    /** * 子要素の描画（各子のトランスフォームを適用）
     */
    async renderChildren({ attr }: AttributeInvoke<AttrContainer>, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { mask } = attr;
        if (!mask) {
            this.renderChildrenToTarget(children);
            return;
        }
        const textureState = this.game.asset.getTexture(mask.asset);
        if (textureState.type !== 'ready') return;
        const { context, matrices, draw } = this.game.pipeline;
        const { gl } = context;

        // マスクの準備
        this.maskTexture.use(() => {
            this.maskTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        this.maskBuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const tex = textureState.data.texture;
            const halfSize = new Vec2(tex.width / 2, tex.height / 2);

            // 中心基準の描画範囲
            const bounds = new AABB2(halfSize.scale(-1), halfSize);
            const mat = getTransform(mask.transform).getMat4();

            matrices.model.scope(() => {
                matrices.model.multiply(mat);
                draw.texture(...bounds.toArray(), tex);
            });
        });

        // 子アイテムの書き出し
        this.childrenTexture.use(() => {
            this.childrenTexture.ensureSize(render.renderBounds.width, render.renderBounds.height);
        });
        this.childrenBuffer.use(() => {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.renderChildrenToTarget(children);
        });

        draw.textureMask(...render.renderBounds.toArray(), this.childrenTexture, this.maskTexture);
    }

    private renderChildrenToTarget(children: Record<string, ItemRender>) {
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
                );
            });
        }
    }

    private isItemCountLimited(item: Item, attr: AttrContainer) {
        if (!attr.constraints) return false;
        if (!attr.constraints.maxItems) return false;
        return item.children.length >= attr.constraints.maxItems;
    }

    /** * 他のアイテムをコンテナに入れるアクション
     */
    async actions({ item, attr }: AttributeInvoke<AttrContainer>, pool: ItemPool, _event: ItemMouseEvent, ctx: { actions: Action[] }): Promise<void> {
        if (!attr.active) return;

        const { states } = this.game.item;
        if (!states.held) return;

        const scene = this.game.states.scene.value;

        if (pool.id === 'fridge' && scene.type !== 'factory') {
            return;
        }

        // ホバーされているのが自分自身、または自分の子供かどうかを確認
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        if (isHovered && !this.isItemCountLimited(item, attr)) {
            const heldItem = this.game.item.items.get(states.held);
            if (!heldItem) return;

            ctx.actions.push({
                title: `${item.name}に乗せる`,
                priority: 100,
                invoke: async () => {
                    states.held = undefined; // 持っている状態を解除
                    this.game.item.attachItem(item, heldItem);
                    await this.reorderChildren(item, attr);
                    await this.constrainItemToBounds(attr, item, heldItem);
                    this.game.item.updateItem(item);
                },
            });
        }
    }

    /**
     * アイテムをプールの境界内に収めるための座標計算を行います。
     */
    private async constrainItemToBounds(attr: AttrContainer, container: Item, child: Item) {
        if (!attr.constraints?.bounds) return;
        const containerRender = await this.game.itemRenderer.getItemRender(container);
        if (containerRender.type !== 'rendered') return;

        const containerBounds = containerRender.render.bounds;

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

        children.sort((a, b) => {
            const aBounds = renderData[a.id]?.bounds;
            const bBounds = renderData[b.id]?.bounds;

            if (!aBounds || !bBounds) return 0; // 描画データがない場合は順序を変えない

            const aCenterY = a.transform.offset.y + (aBounds.min.y + aBounds.max.y) / 2;
            const bCenterY = b.transform.offset.y + (bBounds.min.y + bBounds.max.y) / 2;

            const delta = (bCenterY - aCenterY);
            return attr.layerOrder === 'upper' ? delta : -delta;
        });

        item.children = children.map(child => child.id);
    }
}

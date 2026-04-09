import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import { getAssetKey, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { Action } from '../../core/input-system';
import { getTransform, type Transform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { Item, ItemPool } from '../item';
import ContainerEditor from './ContainerEditor.svelte';

export interface AttrContainer {
    active: boolean;
    cover?: {
        asset: Asset;
        transform: Transform;
    };
    layerOrder: 'upper' | 'lower';
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    readonly name = '容器';
    readonly editor = ContainerEditor;

    constructor(private readonly game: Game) {}

    create(): AttrContainer {
        return { active: true, layerOrder: 'lower' };
    }

    /** * 蓋（カバー）用テクスチャの事前ロード
     */
    async load({ attr }: AttributeInvoke<AttrContainer>, ctx: LoadContext): Promise<void> {
        if (!attr.cover) return;

        const assetState = this.game.asset.getTexture(attr.cover.asset);
        if (assetState.type !== 'ready') {
            const task = ctx.create({ title: `テクスチャ読込中: ${getAssetKey(attr.cover.asset)}` });
            await assetState.promise;
            task.resolve();
        }
    }

    /** * 子要素を含めた全体の描画範囲を計算
     */
    async bounds({ attr, item }: AttributeInvoke<AttrContainer>, result: { render: AABB2 }, childrenRender: Record<string, ItemRender>): Promise<void> {
        for (const id of item.children) {
            const child = this.game.item.items.get(id);
            const renderData = childrenRender[id];
            if (!child || !renderData) continue;

            const mat = getTransform(child.transform).getMat4();
            const worldBounds = mat.transformAABB2(renderData.bounds);
            result.render = result.render.union(worldBounds);
        }
        const { cover } = attr;
        if (cover) {
            const textureState = this.game.asset.getTexture(cover.asset);
            if (textureState.type === 'ready') {
                const { width, height } = textureState.data.texture;
                const bounds = new AABB2(
                    new Vec2(-width / 2, -height / 2),
                    new Vec2(width / 2, height / 2),
                );
                result.render = result.render.union(bounds);
            }
        }
    }

    /** * コンテナ自体の蓋（カバー）やデバッグ情報の描画
     */
    async renderOverlay({ item }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw } = this.game.pipeline;

        const { states } = this.game.item;
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        if (isHovered && states.held) {
            const { min, max } = render.bounds;
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
    async renderChildren(_invoke: AttributeInvoke<AttrContainer>, _render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
        const { draw, matrices } = this.game.pipeline;

        for (const [id, renderData] of Object.entries(children)) {
            const child = this.game.item.items.get(id);
            if (!child) continue;

            matrices.model.scope(() => {
                matrices.model.multiply(getTransform(child.transform).getMat4());
                draw.texture(
                    renderData.bounds.min.x, renderData.bounds.min.y,
                    renderData.bounds.max.x, renderData.bounds.max.y,
                    renderData.texture,
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

        if (pool.id === 'fridge' && scene.type !== 'factory') {
            return;
        }

        // ホバーされているのが自分自身、または自分の子供かどうかを確認
        const hoveringId = states.hovered;
        const hoveringItem = hoveringId && this.game.item.get(hoveringId);
        const isHovered = hoveringId === item.id ||
                         (hoveringItem && this.game.item.getParents(hoveringItem).includes(item));

        if (isHovered) {
            const heldItem = this.game.item.items.get(states.held);
            if (!heldItem) return;

            ctx.actions.push({
                title: `${item.name}に乗せる`,
                priority: 100,
                invoke: async () => {
                    states.held = undefined; // 持っている状態を解除
                    this.game.item.attachItem(item, heldItem);
                    await this.reorderChildren(item, attr);
                },
            });
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

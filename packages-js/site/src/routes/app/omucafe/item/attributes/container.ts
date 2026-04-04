import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import { getAssetKey, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { Action } from '../../core/input-system';
import { getTransform, type Transform } from '../../core/transform';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender, LoadContext } from '../attribute-handler';
import type { ItemPool } from '../item';
import ContainerEditor from './ContainerEditor.svelte';

export interface AttrContainer {
    active: boolean;
    cover?: {
        asset: Asset;
        transform: Transform;
    };
}

export class AttributeContainer implements AttributeHandler<AttrContainer> {
    readonly name = '容器';
    readonly editor = ContainerEditor;

    constructor(private readonly game: Game) {}

    create(): AttrContainer {
        return { active: true };
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
    async bounds({ item }: AttributeInvoke<AttrContainer>, result: { render: AABB2 }, childrenRender: Record<string, ItemRender>): Promise<void> {
        for (const id of item.children) {
            const child = this.game.item.items.get(id);
            const renderData = childrenRender[id];
            if (!child || !renderData) continue;

            const mat = getTransform(child.transform).getMat4();
            const worldBounds = mat.transformAABB2(renderData.bounds);
            result.render = result.render.union(worldBounds);
        }
    }

    /** * コンテナ自体の蓋（カバー）やデバッグ情報の描画
     */
    async renderOverlay({ attr, item }: AttributeInvoke<AttrContainer>, pool: ItemPool, render: ItemRender, children: Record<string, ItemRender>): Promise<void> {
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

        const { states } = this.game.item;
        const hoveringId = states.hovered;
        const isHovered = hoveringId === item.id ||
                                     (hoveringId && this.game.item.getParents(this.game.item.get(hoveringId)!).includes(item));

        if (isHovered && states.held) {
            const { min, max } = render.bounds;
            const { texture } = render;

            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.CONTAINER_HOVERED, 4);
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
        const isHovered = hoveringId === item.id ||
                         (hoveringId && this.game.item.getParents(this.game.item.get(hoveringId)!).includes(item));

        if (isHovered) {
            const heldItem = this.game.item.items.get(states.held);
            if (!heldItem) return;

            ctx.actions.push({
                title: `${item.name}に乗せる`,
                priority: 100,
                invoke: async () => {
                    states.held = undefined; // 持っている状態を解除
                    this.game.item.attachItem(item, heldItem);
                },
            });
        }
    }
}

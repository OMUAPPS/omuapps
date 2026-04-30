import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { validateAsset, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { ValidateResult } from '../../core/helper';
import placeholder from '../../resources/img/placeholder.png';
import type { AttributeHandler, AttributeInvoke, CalculateBoundsContext, ItemMouseEvent, LoadContext, RenderContext } from '../attribute-handler';
import type { ItemPool } from '../item';
import ImageEditor from './ImageEditor.svelte';

export interface AttrImage {
    asset: Asset;
}

export class AttributeImage implements AttributeHandler<AttrImage> {
    readonly name = '画像';
    readonly editor = ImageEditor;

    private static readonly ALPHA_THRESHOLD = 4;

    constructor(private readonly game: Game) {}

    create(): AttrImage {
        return {
            asset: {
                type: 'url',
                url: placeholder,
            },
        };
    }

    validate(value: AttrImage): ValidateResult<AttrImage> {
        const assetResult = validateAsset(value.asset);
        if (assetResult.type === 'invalid') {
            return { type: 'invalid', message: `アセットが無効: ${assetResult.message}` };
        }

        const assetState = this.game.asset.getTexture(value.asset);
        if (assetState.type === 'error') {
            return { type: 'invalid', message: `テクスチャの読み込みに失敗: ${JSON.stringify(value.asset)}` };
        }

        return { type: 'valid', value: value };
    }

    /**
     * アセットのロードタスクを登録
     */
    async load({ attr }: AttributeInvoke<AttrImage>, ctx: LoadContext): Promise<void> {
        const assetState = this.game.asset.getTexture(attr.asset);
        if (assetState.type !== 'ready') {
            const task = ctx.create({
                title: `画像を読み込み中: ${JSON.stringify(attr.asset)}`,
            });
            // Promiseが解決されたらタスクを完了させる
            assetState.promise.then(() => {
                task.resolve();
            });
        }
    }

    /**
     * 透明度を考慮した衝突判定
     */
    async collide({ item, attr }: AttributeInvoke<AttrImage>, _pool: ItemPool, event: ItemMouseEvent, ctx: { hovered?: string }) {
        const textureResult = this.game.asset.getTexture(attr.asset);

        // ロード中の場合は判定を行わない（エラーにはしない）
        if (textureResult.type !== 'ready') return;
        // 自分が操作中の場合は判定をスキップ
        if (ctx.hovered) return;
        if (this.game.item.states.held === item.id) return;
        if (this.game.item.states.held && this.game.item.isItemGrandchildOf(item, this.game.item.states.held)) return;

        const { texture, data } = textureResult.data;
        const { width, height } = texture;
        const { x: lx, y: ly } = event.localPos;

        // 1. 矩形範囲外なら即終了
        if (Math.abs(lx) > width / 2 || Math.abs(ly) > height / 2) return;

        // 2. ピクセルのアルファ値を確認（中心座標系から左上座標系へ変換）
        const px = Math.floor(lx + width / 2);
        const py = Math.floor(ly + height / 2);
        const alphaIndex = (py * width + px) * 4 + 3;

        if (data.data[alphaIndex] >= AttributeImage.ALPHA_THRESHOLD) {
            ctx.hovered = item.id;
        }
    }

    /**
     * 描画範囲の計算。ロード未完了時はエラーをスロー。
     */
    async bounds({ attr }: AttributeInvoke<AttrImage>, ctx: CalculateBoundsContext): Promise<void> {
        const textureResult = this.game.asset.getTexture(attr.asset);

        if (textureResult.type !== 'ready') {
            throw new Error(`[AttributeImage] 境界計算に失敗: アセットが準備できていません (${JSON.stringify(attr.asset)})`);
        }

        const { width, height } = textureResult.data.texture;
        const bounds = new AABB2(
            new Vec2(-width / 2, -height / 2),
            new Vec2(width / 2, height / 2),
        );
        ctx.render = ctx.render.union(bounds);
    }

    async getRenderPass({ attr }: AttributeInvoke<AttrImage>, ctx: RenderContext): Promise<void> {
        const textureResult = this.game.asset.getTexture(attr.asset);

        if (textureResult.type !== 'ready') return;

        ctx.passes.push({
            order: 0,
            render: async () => {
                const { draw } = this.game.pipeline;
                const tex = textureResult.data.texture;

                draw.texture(-tex.width / 2, -tex.height / 2, tex.width / 2, tex.height / 2, tex);
            },
        });
    }
}

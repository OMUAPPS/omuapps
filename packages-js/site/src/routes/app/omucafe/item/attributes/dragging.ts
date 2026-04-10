import { type Vec2Like } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { validateVec2, type ValidateResult } from '../../core/helper';
import type { Action } from '../../core/input-system';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender } from '../attribute-handler';
import type { ItemPool } from '../item';
import DraggingEditor from './DraggingEditor.svelte';

export interface AttrDragging {
    active: boolean;
    lastDrag?: {
        timestamp: number;
        offset: Vec2Like;
    };
}

/** * アイテムの「つかみ」操作を管理する属性ハンドラー
 */
export class AttributeDragging implements AttributeHandler<AttrDragging> {
    readonly name = 'つかみ';
    readonly editor = DraggingEditor;

    private static readonly FADE_DURATION = 1000; // ms
    private static readonly OUTLINE_WIDTH = 4;
    private static readonly DRAG_EFFECT_MAX_WIDTH = 6;

    constructor(private readonly game: Game) {}

    create(): AttrDragging {
        return { active: true };
    }

    validate(value: AttrDragging): ValidateResult<AttrDragging> {
        if (typeof value.active !== 'boolean') {
            return { type: 'invalid', message: 'activeはbooleanでなければなりません' };
        }
        if (value.lastDrag) {
            if (typeof value.lastDrag.timestamp !== 'number') {
                return { type: 'invalid', message: 'lastDrag.timestampはnumberでなければなりません' };
            }
            const offsetResult = validateVec2(value.lastDrag.offset);
            if (offsetResult.type === 'invalid') {
                return { type: 'invalid', message: `lastDrag.offsetが無効: ${offsetResult.message}` };
            }
        }
        return { type: 'valid', value: value };
    }

    /** * ホバー時やドラッグ直後のエフェクト描画
     */
    async renderOverlay(
        { item, attr }: AttributeInvoke<AttrDragging>,
        pool: ItemPool,
        render: ItemRender,
    ): Promise<void> {
        const { draw } = this.game.pipeline;
        const { min, max } = render.renderBounds;
        const { texture } = render;

        // 1. ホバー時のアウトライン表示
        if (this.game.item.states.hovered === item.id) {
            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.ACCENT, AttributeDragging.OUTLINE_WIDTH);
        }

        // 2. ドラッグ解除後の残像エフェクト（イージング付き）
        if (attr.lastDrag) {
            const elapsed = Date.now() - attr.lastDrag.timestamp;
            if (elapsed > AttributeDragging.FADE_DURATION) return;

            const t = 1 - elapsed / AttributeDragging.FADE_DURATION;
            // 指数関数で急激に細くなるエフェクト
            const width = Math.pow(t, 6) * AttributeDragging.DRAG_EFFECT_MAX_WIDTH;

            draw.textureOutline(min.x, min.y, max.x, max.y, texture, PALETTE_RGB.TOOLTIP_TEXT, width);
        }
    }

    /** * ドラッグ中の位置更新処理
     */
    async mouse({ item, attr }: AttributeInvoke<AttrDragging>, pool: ItemPool, event: ItemMouseEvent): Promise<void> {
        if (this.game.item.states.held !== item.id || !attr.lastDrag) return;

        if (event.kind === 'mouse-move') {
            // アイテムの位置 = 現在のマウス座標 - 掴んだ時の相対位置
            item.transform.offset = event.poolPos.sub(attr.lastDrag.offset);
        }
    }

    /** * 「持つ」アクションの登録
     */
    async actions(
        { item, attr }: AttributeInvoke<AttrDragging>,
        pool: ItemPool,
        event: ItemMouseEvent,
        ctx: { actions: Action[] },
    ): Promise<void> {
        if (!attr.active) return;

        // 他のアイテムを持っていない、かつ自身がホバーされている場合
        const isPickable = !this.game.item.states.held && this.game.item.states.hovered === item.id;
        const { states } = this.game;

        if (!isPickable) return;

        // シーン固有の参照更新（ファクトリーシーン用）
        const scene = this.game.states.scene.value;
        if (scene.type === 'factory') {
            if (scene.selecting?.type === 'pick_product') {
                ctx.actions.push({
                    title: `${item.name}を商品化する`,
                    priority: 100,
                    invoke: async () => {
                        this.game.scene.factory.createProductFromItem(item);
                    },
                });
            }
        }

        ctx.actions.push({
            title: `${item.name}を持つ`,
            priority: 100,
            invoke: async () => {
                if (states.scene.value.type !== 'factory' && pool.id === 'fridge') {
                    item = this.game.item.clone(item);
                }
                if (states.scene.value.type === 'factory' && (!states.scene.value.selecting || states.scene.value.selecting.type === 'edit_item')) {
                    states.scene.value.selecting = { type: 'edit_item', itemId: item.id };
                }
                this.game.item.states.held = item.id;
                this.game.item.dettachItem(item);

                // 掴んだ瞬間のマウス座標とアイテム座標の差分を保存
                attr.lastDrag = {
                    timestamp: Date.now(),
                    offset: event.poolPos.sub(item.transform.offset),
                };
            },
        });
    }
}

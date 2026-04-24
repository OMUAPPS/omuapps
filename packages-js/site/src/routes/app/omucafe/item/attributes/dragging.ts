import { type Vec2Like } from '$lib/math/vec2';
import { validateAudioClip, type AudioClip } from '../../audio';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { validateAssetTransform, type AssetTransform } from '../../core/game-renderer';
import { validateVec2, type ValidateResult } from '../../core/helper';
import type { Action } from '../../core/input-system';
import type { AttributeHandler, AttributeInvoke, ItemMouseEvent, ItemRender } from '../attribute-handler';
import type { Item, ItemPool } from '../item';
import DraggingEditor from './DraggingEditor.svelte';

export interface AttrDragging {
    active: boolean;
    lastDrag?: {
        timestamp: number;
        offset: Vec2Like;
    };
    dragSound?: AudioClip;
    dropSound?: AudioClip;
    hand?: {
        behind?: AssetTransform;
        front?: AssetTransform;
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
        if (value.dragSound) {
            const dragSoundResult = validateAudioClip(value.dragSound);
            if (dragSoundResult.type === 'invalid') {
                return { type: 'invalid', message: `dragSoundが無効: ${dragSoundResult.message}` };
            }
        }
        if (value.dropSound) {
            const dropSoundResult = validateAudioClip(value.dropSound);
            if (dropSoundResult.type === 'invalid') {
                return { type: 'invalid', message: `dropSoundが無効: ${dropSoundResult.message}` };
            }
        }
        if (value.hand) {
            if (value.hand.behind) {
                const behindResult = validateAssetTransform(value.hand.behind);
                if (behindResult.type === 'invalid') {
                    return { type: 'invalid', message: `hand.behindが無効: ${behindResult.message}` };
                }
            }
            if (value.hand.front) {
                const frontResult = validateAssetTransform(value.hand.front);
                if (frontResult.type === 'invalid') {
                    return { type: 'invalid', message: `hand.frontが無効: ${frontResult.message}` };
                }
            }
        }
        return { type: 'valid', value: value };
    }

    /** * ホバー時やドラッグ直後のエフェクト描画
     */
    async renderOverlayPre(
        { item, attr }: AttributeInvoke<AttrDragging>,
        pool: ItemPool,
        render: ItemRender,
    ): Promise<void> {
        const behind = attr.hand?.behind;
        if (behind) {
            await this.game.renderer.drawAssetTransform(behind);
        }
    }

    /** * ホバー時やドラッグ直後のエフェクト描画
     */
    async renderOverlayPost(
        { item, attr }: AttributeInvoke<AttrDragging>,
        pool: ItemPool,
        render: ItemRender,
    ): Promise<void> {
        const { draw } = this.game.pipeline;
        const { min, max } = render.renderBounds;
        const { texture } = render;

        // 1. ホバー時のアウトライン表示
        const isPickable = this.isPickable(item, attr);
        if (isPickable) {
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

        const front = attr.hand?.front;
        if (front) {
            await this.game.renderer.drawAssetTransform(front);
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
        // 他のアイテムを持っていない、かつ自身がホバーされている場合
        const isPickable = this.isPickable(item, attr);
        const { states } = this.game;

        if (!isPickable) return;

        // シーン固有の参照更新（ファクトリーシーン用）
        const scene = this.game.states.scene.value;
        if (scene.type === 'factory') {
            if (scene.selecting?.type === 'pick_product') {
                ctx.actions.push({
                    title: `${item.name}を商品化する`,
                    id: `factory-pick-${item.id}`,
                    priority: 100,
                    invoke: async () => {
                        this.game.scene.factory.createProductFromItem(item);
                    },
                });
            }
        }
        if (scene.type === 'export' && item.parent) {
            return;
        }

        ctx.actions.push({
            title: `${item.name}を持つ(マウスホイールで複製)`,
            id: `pick-${item.id}`,
            priority: 100,
            invoke: async () => {
                const shouldClone = (states.scene.value.type !== 'factory' && pool.id === 'fridge') || event.mouse.buttons[1];
                if (shouldClone) {
                    item = this.game.item.clone(item);
                }
                if (states.scene.value.type === 'factory' && (!states.scene.value.selecting || states.scene.value.selecting.type === 'edit_item')) {
                    states.scene.value.selecting = { type: 'edit_item', itemId: item.id };
                }
                await this.game.item.holdItem(item);
                this.game.item.dettachItem(item);

                attr.lastDrag = {
                    timestamp: Date.now(),
                    offset: event.poolPos.sub(item.transform.offset),
                };
            },
        });
    }

    private isPickable(item: Item, attr: AttrDragging): boolean {
        const scene = this.game.states.scene.value;
        const { held, hovered } = this.game.item.states;
        if (hovered !== item.id) return false;
        if (scene.type === 'factory' || (scene.type === 'kitchen' && scene.editMode)) {
            return true;
        }
        if (!attr.active) return false;
        return !held;
    }

    async drag({ attr }: AttributeInvoke<AttrDragging>, _pool: ItemPool): Promise<void> {
        if (attr.dragSound) {
            this.game.audio.start(attr.dragSound);
        }
    }

    async drop({ attr }: AttributeInvoke<AttrDragging>, _pool: ItemPool): Promise<void> {
        if (attr.dropSound) {
            this.game.audio.start(attr.dropSound);
        }
    }
}

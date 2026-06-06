import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { Timer } from '$lib/timer';
import { PALETTE_RGB } from '../../../colors';
import type { Game } from '../../../core/game';
import type { BufferedMap, Order } from '../../../core/game-state';
import type { Action } from '../../../core/input-system';
import { SCENE_CONFIG, type SceneKitchenData } from '../config';

/**
 * キッチン内のディスプレイ（注文リスト、操作パネル等）を管理・描画するクラス
 */
export class Display {
    public bounds: AABB2 = AABB2.ZEROONE;
    private action: Action | undefined;
    private scroll = 0;
    private scrollTarget = 0;
    private scrollHeight = 0;

    constructor(private readonly game: Game) {}

    public async render(scene: SceneKitchenData) {
        const { draw, matrices, input } = this.game.pipeline;
        this.action = undefined;
        draw.fontFamily = SCENE_CONFIG.UI.FONT_FAMILY;
        draw.fontWeight = '600';

        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);

        if (scene.editMode) {
            await this.renderEditModeUI(mouse, scene);
        } else {
            await this.renderNormalModeUI(mouse, scene);
        }
    }

    private async renderEditModeUI(mouse: Vec2, scene: SceneKitchenData) {
        const [controlPanelButton, backButton] = this.bounds.shrink({ x: 20, y: 150 }).split({
            direction: 'x',
            ratio: 0.5,
            gap: 20,
        });

        await this.renderButton('管理画面', controlPanelButton, {
            title: 'データの管理など',
            id: 'control-panel',
            priority: 0,
            invoke: async () => {
                this.game.startTransition({ type: 'settings', prev: { type: 'kitchen' } });
            },
        });

        await this.renderButton('戻る', backButton, {
            title: '編集を終える',
            id: 'exit-edit-mode',
            priority: 0,
            invoke: async () => { scene.editMode = undefined; },
        });
    }

    private async renderNormalModeUI(mouse: Vec2, scene: SceneKitchenData) {
        const { orders } = this.game.states;
        const [listBounds, actionsBounds] = this.bounds.shrink({ x: 10, y: 50 }).split({
            direction: 'x',
            ratio: 0.5,
            gap: 10,
        });

        await this.renderOrderList(orders, listBounds.shrink({ x: 30, y: 20 }), mouse);

        const [setupButton, factoryButton] = actionsBounds.shrink({ x: 50, y: 50 }).split({
            direction: 'y',
            ratio: 0.5,
            gap: 10,
        });

        await this.renderButton('店の設定', setupButton, {
            title: '店の設定をする',
            id: 'setup-kitchen',
            priority: 1,
            invoke: async () => {
                scene.editMode = { type: 'kitchen', timestamp: Timer.now() };
            },
        });

        await this.renderButton('商品開発', factoryButton, {
            title: '商品開発へ移動',
            id: 'go-to-factory',
            priority: 1,
            invoke: async () => {
                this.game.startTransition({ type: 'factory' }, {
                    title: '研究所へ移動中…',
                    duration: 750,
                });
            },
        });
    }

    private async renderButton(text: string, bounds: AABB2, action: Action) {
        const { matrices, draw, input } = this.game.pipeline;
        draw.roundedRect(bounds.min, bounds.max, SCENE_CONFIG.UI.BUTTON_RADIUS, PALETTE_RGB.DISPLAY_BUTTON_BG);
        draw.fontSize = 32;
        draw.fontWeight = '600';
        await draw.textAlign(bounds.center, text, Vec2.CENTER, PALETTE_RGB.DISPLAY_BUTTON_TEXT);

        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);
        if (bounds.contains(mouse)) {
            this.action = action;
        }
    }

    private async renderOrderList(orders: BufferedMap<Order>, bounds: AABB2, mouse: Vec2) {
        const { draw, matrices } = this.game.pipeline;
        const entries = Array.from(orders.values());
        const cfg = SCENE_CONFIG.UI.ORDER_LIST;

        if (entries.length === 0) {
            draw.fontSize = 16;
            draw.fontWeight = '500';
            const [textBounds, photoButton] = bounds.shrink({ x: 50, y: 50 }).split({
                direction: 'y',
                ratio: 0.5,
                gap: 10,
            });
            await draw.textAlign(textBounds.center, '注文はまだありません', Vec2.CENTER, PALETTE_RGB.ACCENT);
            await this.renderButton('写真を撮る', photoButton, {
                title: '写真を撮る',
                id: 'photo-mode',
                priority: 1,
                invoke: async () => {
                    this.game.scene.photo.openPhotoMode();
                },
            });
            return;
        }

        draw.fontSize = 32;
        this.scroll = lerp(this.scroll, this.scrollTarget, cfg.SCROLL_SPEED);
        let offsetY = bounds.min.y + this.scroll;
        draw.scissor(this.bounds);

        // 「注文リスト」のタイトルを描画
        await draw.textAlign(new Vec2(bounds.center.x, offsetY), '注文リスト', Vec2.CENTER, PALETTE_RGB.ACCENT);
        offsetY += 60;

        for (const order of entries) {
            const elapsed = Timer.now() - order.timestamp - 500;
            if (elapsed < 0) {
                continue;
            }
            const animationT = Math.pow(Math.min(1, elapsed / 200), 2);
            const padding = { x: 20, y: 30 };
            const calculatedHeight = cfg.ITEM_SPACING + 64 + order.products.length * 30 - 20;
            matrices.model.push();
            matrices.model.translate((1 - animationT) * 20, 0, 0);
            // 背景を描画
            draw.roundedRect(
                new Vec2(bounds.min.x, offsetY).sub(padding),
                new Vec2(bounds.max.x, offsetY + calculatedHeight).add(padding),
                10,
                PALETTE_RGB.DISPLAY_BG.with({ w: animationT }),
            );
            const minY = offsetY;
            offsetY += cfg.ITEM_SPACING;

            // アバター描画
            if (order.customer.user.avatar) {
                const avatarStatus = (await this.game.asset.getTextureByUrl(order.customer.user.avatar).promise);
                if (avatarStatus.type === 'ready') {
                    const avatarMax = new Vec2(bounds.min.x + cfg.AVATAR_SIZE, offsetY - cfg.ITEM_SPACING + cfg.AVATAR_SIZE);
                    draw.roundedRectTexture({ x: bounds.min.x, y: offsetY - cfg.ITEM_SPACING }, avatarMax, cfg.AVATAR_SIZE / 2, avatarStatus.data.texture, Vec4.ONE.with({ w: animationT }));
                }
            }

            // ユーザー名
            draw.fontWeight = '600';
            // await draw.textAlign(new Vec2(bounds.min.x + 64, offsetY - cfg.ITEM_SPACING + 12), order.customer.user.name, Vec2.ZERO, PALETTE_RGB.DISPLAY_TEXT);
            const usernameBounds = new AABB2(
                new Vec2(bounds.min.x + 64, offsetY - cfg.ITEM_SPACING),
                new Vec2(bounds.max.x, offsetY - cfg.ITEM_SPACING + 32),
            );
            await draw.textFit(usernameBounds, order.customer.user.name, { x: 0, y: 0.5 }, PALETTE_RGB.DISPLAY_TEXT.with({ w: animationT }));
            offsetY += 64 - cfg.ITEM_SPACING;

            // 注文ヘッダー
            draw.fontWeight = '500';
            draw.fontSize = 18;
            await draw.textAlign(new Vec2(bounds.min.x + 64, offsetY), '注文内容', Vec2.ZERO, PALETTE_RGB.DISPLAY_TEXT.with({ w: animationT }));
            offsetY += 30;

            // 注文アイテム
            for (const item of order.products) {
                draw.fontWeight = '500';
                draw.fontSize = 24;
                await draw.textAlign(new Vec2(bounds.min.x + 64, offsetY), `・ ${item.name}`, Vec2.ZERO, PALETTE_RGB.DISPLAY_TEXT.with({ w: animationT }));
                offsetY += 30;
            }
            offsetY += 68;

            // インタラクション判定
            const orderBounds = new AABB2(new Vec2(bounds.min.x, minY), new Vec2(bounds.max.x, offsetY));
            if (orderBounds.contains(mouse)) {
                this.action = {
                    id: `view-order-${order.id}`,
                    title: 'クリックで納品',
                    priority: 0,
                    invoke: async () => await this.game.scene.photo.openPhotoMode(order),
                };
            }
            matrices.model.pop();
        }

        draw.endScissor();
        this.scrollHeight = offsetY - this.scroll - bounds.min.y;
    }

    public handle(event: InputEvent) {
        const { input, pipeline } = this.game;
        const mouse = pipeline.matrices.getViewToWorld().transform2(pipeline.input.mouse.pos);

        if (!this.bounds.contains(mouse)) return;

        if (event.kind === 'mouse-wheel') {
            this.scrollTarget -= event.delta;
            this.scrollTarget = clamp(this.scrollTarget, Math.min(0, this.bounds.size.y - this.scrollHeight - 100), 0);
        }

        if (this.action) {
            input.add(this.action);
        }
    }
}

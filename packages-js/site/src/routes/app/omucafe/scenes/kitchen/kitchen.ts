import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { InputEvent } from '$lib/components/canvas/pipeline';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { PALETTE_RGB } from '../../colors';
import { Game } from '../../core/game';
import { CLIENT_RESOLUTION, CLIENT_WORLD_BOUNDS } from '../../core/game-renderer';
import type { Action } from '../../core/input-system';
import type { ItemPool, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import asset_vertical_background from './img/asset_vertical_background.png';
import asset_vertical_counter from './img/asset_vertical_counter.png';
import asset_vertical_kitchen from './img/asset_vertical_kitchen.png';
import client_counter from './img/client_counter.png';
import client_kitchen from './img/client_kitchen.png';
import ScreenKitchen from './ScreenKitchen.svelte';

export interface SceneKitchenData {
    type: 'kitchen';
    display?: {
        type: 'welcome';
    };
}

// レイアウト計算結果の型定義
interface SceneLayout {
    center: Vec2;
    kitchenOptions: PoolOptions;
    counterOptions: PoolOptions;
}

// アセットデータの型定義
interface SceneAssets {
    texBackground: GlTexture;
    texKitchen: GlTexture;
    texCounter: GlTexture;
}

/** 画面設計の定数 */
const DESIGN = {
    WIDTH: CLIENT_RESOLUTION.x,
    HEIGHT: CLIENT_RESOLUTION.y,
    COUNTER_WIDTH: (CLIENT_RESOLUTION.x / 7) * 4,
    COUNTER_HEIGHT: 300,
} as const;

/** 描画用のマジックナンバー（オフセットなど）を管理 */
const OFFSETS = {
    DISPLAY: {
        MAX_SUB_1: { x: 1160, y: 1105 },
        MAX_SUB_2: { x: 310, y: 635 },
    },
    OVERLAY: {
        KITCHEN_Y: -200,
        COUNTER_Y: 200,
        TRASHBIN_X: 400,
    },
    CLIENT: {
        COUNTER_Y: -300,
    },
} as const;

class Display {
    public bounds: AABB2 = AABB2.ZEROONE;
    private action: Action | undefined;
    private scroll = 0;
    private scrollTarget = 0;
    private scrollHeight = 0;

    constructor(private readonly game: Game) {}

    public async render() {
        const { orders } = this.game.states;
        const { matrices, draw, input } = this.game.pipeline;
        this.action = undefined;
        orders.set('8', {
            id: '8',
            items: [{
                id: '8',
                name: 'テスト商品',
                itemId: 'aktmme11',
            }],
            user: {
                source: { type: 'task' },
                avatar: 'https://pbs.twimg.com/profile_images/1985575332007845888/0CgI0pIh_400x400.jpg',
                name: 'テスト',
            },
        });

        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);
        draw.fontSize = 32;

        const entries = Array.from(orders.values());
        const listBounds = this.bounds.with({ max: { x: this.bounds.center.x } }).shrink({ x: 10, y: 10 });

        this.scroll = lerp(this.scroll, this.scrollTarget, 0.5);
        let offsetY = listBounds.min.y + this.scroll;
        draw.scissor(this.bounds);

        for (const order of entries) {
            const minY = offsetY;
            offsetY += 10;
            const avatarStatus = (await this.game.asset.getTextureByUrl(order.user.avatar).promise);
            if (avatarStatus.type === 'ready') {
                draw.texture(listBounds.min.x, offsetY, listBounds.min.x + 48, offsetY + 48, avatarStatus.data.texture);
            }
            draw.fontWeight = '600';
            await draw.textAlign(new Vec2(listBounds.min.x + 64, offsetY + 12), order.user.name, Vec2.ZERO, PALETTE_RGB.ACCENT);
            offsetY += 64;

            draw.fontWeight = '500';
            draw.fontSize = 18;
            await draw.textAlign(new Vec2(listBounds.min.x + 64, offsetY), '注文内容', Vec2.ZERO, PALETTE_RGB.ACCENT);
            offsetY += 30;

            for (const item of order.items) {
                draw.fontWeight = '500';
                draw.fontSize = 24;
                await draw.textAlign(new Vec2(listBounds.min.x + 64, offsetY), `・ ${item.name}`, Vec2.ZERO, PALETTE_RGB.ACCENT);
                offsetY += 30;
            }
            offsetY += 24;
            draw.rectangle(listBounds.min.x, offsetY, listBounds.max.x, offsetY + 1, PALETTE_RGB.ACCENT);

            const bounds = new AABB2(
                new Vec2(listBounds.min.x, minY),
                new Vec2(listBounds.max.x, offsetY),
            );
            const hovered = bounds.contains(mouse);
            if (hovered) {
                this.action = {
                    title: 'クリックで納品',
                    priority: 0,
                    invoke: async () => {
                        this.game.scene.photo.openPhotoMode(order);
                    },
                };
            }
        }

        draw.endScissor();

        this.scrollHeight = offsetY - this.scroll - listBounds.min.y;
    }

    public handle(event: InputEvent) {
        const { input } = this.game;
        const { matrices } = this.game.pipeline;
        const mouse = matrices.getViewToWorld().transform2(this.game.pipeline.input.mouse.pos);
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

export class SceneKitchen implements SceneHandler<SceneKitchenData> {
    public readonly component = ScreenKitchen;
    private display: Display;
    private cachedAssets: SceneAssets | null = null; // アセットのキャッシュ

    constructor(private readonly game: Game) {
        this.display = new Display(this.game);
    }

    /**
     * 1. 必要なアセットをまとめて取得（キャッシュ付き）
     */
    private async loadAssets(): Promise<SceneAssets> {
        if (this.cachedAssets) {
            return this.cachedAssets;
        }

        const { asset: assetManager, side } = this.game;
        const isClient = side === 'client';

        const [bg, kitchen, counter] = await Promise.all([
            assetManager.getTextureByUrl(isClient ? client_background : asset_vertical_background).promise,
            assetManager.getTextureByUrl(isClient ? client_kitchen : asset_vertical_kitchen).promise,
            assetManager.getTextureByUrl(isClient ? client_counter : asset_vertical_counter).promise,
        ]);

        this.cachedAssets = {
            texBackground: bg.unwrap.texture,
            texKitchen: kitchen.unwrap.texture,
            texCounter: counter.unwrap.texture,
        };

        return this.cachedAssets;
    }

    /**
     * PoolOptions生成の共通ロジック
     */
    private createPoolOptions(pool: ItemPool, width: number, height: number, offset: Vec2Like): PoolOptions {
        return {
            pool,
            transform: { right: { x: 1, y: 0 }, up: { x: 0, y: 1 }, offset },
            bounds: new AABB2(
                new Vec2(-CLIENT_RESOLUTION.x / 2, 0),
                new Vec2(-CLIENT_RESOLUTION.x / 2 + width, height),
            ),
        };
    }

    /**
     * 2. 描画用のレイアウト計算 (Scale, Offset, Bounds)
     */
    private calculateLayoutClient(): SceneLayout {
        return {
            center: Vec2.ZERO,
            kitchenOptions: this.createPoolOptions(this.game.states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, Vec2.ZERO),
            counterOptions: this.createPoolOptions(this.game.states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: 0, y: -DESIGN.COUNTER_HEIGHT }),
        };
    }

    private calculateLayoutOverlay(assets: SceneAssets): SceneLayout {
        const { renderer, states } = this.game;
        const counterHeight = assets.texCounter.height / renderer.scale;
        const counterOffsetY = renderer.bounds.max.y - counterHeight;
        const centerX = CLIENT_RESOLUTION.x / 2 - DESIGN.COUNTER_WIDTH / 2;

        return {
            center: Vec2.ZERO,
            kitchenOptions: this.createPoolOptions(states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, { x: centerX, y: OFFSETS.OVERLAY.KITCHEN_Y }),
            counterOptions: this.createPoolOptions(states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: centerX, y: counterOffsetY + OFFSETS.OVERLAY.COUNTER_Y }),
        };
    }

    /**
     * 3. 実際の描画処理
     */
    private async renderScene(assets: SceneAssets, layout: SceneLayout) {
        if (this.game.side === 'client') {
            await this.renderClientSide(assets, layout);
        } else if (this.game.side === 'overlay') {
            await this.renderOverlaySide(assets, layout);
        } else if (this.game.side === 'background') {
            await this.renderBackgroundSide(assets);
        }
    }

    private async renderClientSide(assets: SceneAssets, layout: SceneLayout) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, trashbin, fridge, states, renderer } = this.game;

        // 背景
        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);
        draw.texture(...renderer.bounds.toArray(), assets.texKitchen);

        itemRenderer.initPass();

        // カウンターレイヤー
        const counterTextureBounds = CLIENT_WORLD_BOUNDS.fit(assets.texCounter.size).offset({ x: 0, y: OFFSETS.CLIENT.COUNTER_Y });
        draw.texture(...counterTextureBounds.toArray(), assets.texCounter);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);

        // キッチンレイヤー
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        // ディスプレイ
        await this.renderDisplay(assets);

        // オーバーレイ
        await trashbin.render(new Vec2(renderer.bounds.max.x - OFFSETS.OVERLAY.TRASHBIN_X, renderer.bounds.max.y));
        await fridge.render();
        await itemRenderer.renderHeld();
    }

    private async renderOverlaySide(assets: SceneAssets, layout: SceneLayout) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, states, fridge, renderer } = this.game;

        // 背景
        const counterHeight = assets.texCounter.height / renderer.scale;
        const { min, max } = layout.kitchenOptions.bounds;
        draw.texture(min.x, min.y + OFFSETS.OVERLAY.KITCHEN_Y, max.x, max.y + OFFSETS.OVERLAY.KITCHEN_Y, assets.texKitchen);

        itemRenderer.initPass();

        // キッチンレイヤー
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        // カウンターレイヤー
        draw.texture(renderer.bounds.min.x, renderer.bounds.max.y - counterHeight + OFFSETS.OVERLAY.COUNTER_Y, renderer.bounds.max.x, renderer.bounds.max.y + OFFSETS.OVERLAY.COUNTER_Y, assets.texCounter);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);

        await fridge.render();

        // オーバーレイ
        await itemRenderer.renderHeld();
    }

    private async renderBackgroundSide(assets: SceneAssets) {
        const { draw } = this.game.pipeline;
        const { renderer } = this.game;

        // 背景
        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);
    }

    private async renderDisplay(assets: SceneAssets) {
        const counterBounds = CLIENT_WORLD_BOUNDS.fit(assets.texCounter.size);
        this.display.bounds = new AABB2(
            counterBounds.max.sub(OFFSETS.DISPLAY.MAX_SUB_1),
            counterBounds.max.sub(OFFSETS.DISPLAY.MAX_SUB_2),
        );
        await this.display.render();
    }

    /**
     * 4. 入力イベントのハンドリング
     */
    private async processInput(layout: SceneLayout) {
        const { input: eventPipeline } = this.game.pipeline;
        const { item, fridge, input: inputSystem, trashbin, states } = this.game;

        for (const event of eventPipeline) {
            inputSystem.clear();
            item.initPass();

            // 判定は手前にあるものから順に行う
            await fridge.handleInput(event);
            await trashbin.handleInput(event);
            await item.handleMouse(states.counter.value, layout.counterOptions, event);
            await item.handleMouse(states.kitchen.value, layout.kitchenOptions, event);
            this.display.handle(event);

            item.endInput();
            await inputSystem.handle(event);
        }
    }

    /**
     * メインハンドラ: 流れを制御する
     */
    async handle() {
        // 1. 準備
        const assets = await this.loadAssets();
        const layout = this.game.side === 'client'
            ? this.calculateLayoutClient()
            : this.calculateLayoutOverlay(assets);

        // 2. 実行
        await this.renderScene(assets, layout);
        await this.processInput(layout);
    }
}

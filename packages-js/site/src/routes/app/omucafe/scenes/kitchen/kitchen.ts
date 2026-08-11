import type { GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { lerp } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { Timer } from '$lib/timer';
import { elasticIn } from 'svelte/easing';
import { PALETTE_RGB } from '../../colors';
import { Game } from '../../core/game';
import { CLIENT_RESOLUTION, CLIENT_WORLD_BOUNDS } from '../../core/game-renderer';
import type { Action } from '../../core/input-system';
import type { ItemPool, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import { CustomerRenderer } from './component/customer';
import { Display } from './component/display';
import { ParticleRenderer } from './component/particle';
import { SCENE_CONFIG, type SceneKitchenData } from './config';
import asset_horizontal_background from './img/asset_horizontal_background.png';
import asset_vertical_background from './img/asset_vertical_background.png';
import asset_vertical_counter from './img/asset_vertical_counter.png';
import asset_vertical_kitchen from './img/asset_vertical_kitchen.png';
import client_counter from './img/client_counter.png';
import client_kitchen from './img/client_kitchen.png';
import ScreenKitchen from './ScreenKitchen.svelte';

export type { SceneKitchenData };

export interface SceneLayout {
    center: Vec2;
    kitchenOptions: PoolOptions;
    counterOptions: PoolOptions;
}

export interface SceneAssetsCommon {
    texBackground: GlTexture;
    texKitchen: GlTexture;
    texCounter: GlTexture;
}

// ==========================================
// 1. レイアウト計算ロジックの分離 (Layout Calculator)
// ==========================================
class KitchenLayoutCalculator {
    static calculateClient(game: Game): SceneLayout {
        const { DESIGN } = SCENE_CONFIG;
        return {
            center: Vec2.ZERO,
            kitchenOptions: this.createPoolOptions('キッチン', game.states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, Vec2.ZERO),
            counterOptions: this.createPoolOptions('カウンター', game.states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: 0, y: -DESIGN.COUNTER_HEIGHT }),
        };
    }

    static calculateOverlay(game: Game, assets: SceneAssetsCommon): SceneLayout {
        const { renderer, states } = game;
        const { DESIGN, OFFSETS } = SCENE_CONFIG;
        const counterHeight = assets.texCounter.height / renderer.scale;
        const counterOffsetY = renderer.bounds.max.y - counterHeight;
        const centerX = CLIENT_RESOLUTION.x / 2 - DESIGN.COUNTER_WIDTH / 2;
        const isVertical = renderer.isVertical();

        return {
            center: Vec2.ZERO,
            kitchenOptions: this.createPoolOptions('キッチン', states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, { x: centerX, y: OFFSETS.OVERLAY.KITCHEN_Y }),
            counterOptions: this.createPoolOptions('カウンター', states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: centerX, y: counterOffsetY + (isVertical ? OFFSETS.OVERLAY.COUNTER_Y_VERTICAL : OFFSETS.OVERLAY.COUNTER_Y_HORIZONTAL) }),
        };
    }

    private static createPoolOptions(name: string, pool: ItemPool, width: number, height: number, offset: Vec2Like): PoolOptions {
        return {
            pool,
            name,
            ordering: 'lower',
            transform: { right: { x: 1, y: 0 }, up: { x: 0, y: 1 }, offset },
            bounds: new AABB2(
                new Vec2(-CLIENT_RESOLUTION.x / 2, 0),
                new Vec2(-CLIENT_RESOLUTION.x / 2 + width, height),
            ),
        };
    }
}

// ==========================================
// 3. メインコントローラー (Main Handler)
// ==========================================

export class SceneKitchen implements SceneHandler<SceneKitchenData> {
    public readonly component = ScreenKitchen;
    private display: Display;
    private cachedAssets: SceneAssetsCommon | undefined;
    private pendingAction: Action | undefined; // 名前を clickAction から変更して意図を明確に

    // 抽出したレンダラーのインスタンス
    private particleRenderer: ParticleRenderer;
    private customerRenderer: CustomerRenderer;

    constructor(private readonly game: Game) {
        this.display = new Display(this.game);
        this.particleRenderer = new ParticleRenderer(this.game);
        this.customerRenderer = new CustomerRenderer(this.game);
    }

    private async loadAssets(): Promise<SceneAssetsCommon> {
        if (this.cachedAssets) return this.cachedAssets;

        const { asset: assetManager, side, renderer } = this.game;
        const isClient = side === 'client';

        const [bg, kitchen, counter] = await Promise.all([
            assetManager.getTextureByUrl(isClient ? client_background : (renderer.isVertical() ? asset_vertical_background : asset_horizontal_background)).promise,
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

    private async renderScene(assets: SceneAssetsCommon, layout: SceneLayout, scene: SceneKitchenData) {
        switch (this.game.side) {
            case 'client':
                await this.renderClientSide(assets, layout, scene);
                break;
            case 'overlay':
                if (this.game.renderer.isVertical()) {
                    await this.renderOverlaySideVertical(assets, layout);
                } else {
                    await this.renderOverlaySideHorizontal(assets, layout);
                }
                break;
            case 'background':
                await this.renderBackgroundSide(assets);
                break;
            default:
                console.warn(`Unhandled game side: ${this.game.side}`);
        }
    }

    private async renderClientSide(assets: SceneAssetsCommon, layout: SceneLayout, scene: SceneKitchenData) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, trashbin, fridge, states, renderer } = this.game;
        const isInEditMode = scene.editMode?.type === 'kitchen';

        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);

        this.particleRenderer.render();
        if (!isInEditMode) {
            await this.customerRenderer.render((action) => { this.pendingAction = action; });
        }

        draw.texture(...renderer.bounds.toArray(), assets.texKitchen);

        itemRenderer.initPass();

        const counterTextureBounds = CLIENT_WORLD_BOUNDS.fit(assets.texCounter.size).offset({ x: 0, y: SCENE_CONFIG.OFFSETS.CLIENT.COUNTER_Y });
        draw.texture(...counterTextureBounds.toArray(), assets.texCounter);

        await this.renderDisplay(scene, assets);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        await trashbin.render(new Vec2(renderer.bounds.max.x - SCENE_CONFIG.OFFSETS.OVERLAY.TRASHBIN_X, renderer.bounds.max.y));
        await fridge.render();
        await itemRenderer.renderHeld();

        if (isInEditMode && scene.editMode) {
            await this.renderEditModeEffects(scene.editMode.timestamp);
        }
    }

    private async renderEditModeEffects(timestamp: number) {
        const { draw } = this.game.pipeline;
        const { renderer } = this.game;
        const { EDIT_MODE } = SCENE_CONFIG.UI;

        const elapsed = Timer.now() - timestamp;
        const t = elasticIn(1 - 1 / elapsed);
        const margin = lerp(-100, 50, t);
        const color = PALETTE_RGB.ACCENT.lerp(PALETTE_RGB.SECONDARY, (Math.sin(Timer.now() / EDIT_MODE.WAVE_SPEED_DIVISOR * Math.PI) + 1) / 2).with({ w: t });
        const bounds = renderer.bounds.shrink({ x: -50, y: margin });
        const wave = Math.sin(elapsed / EDIT_MODE.WAVE_SPEED_DIVISOR * Math.PI) * 5;

        draw.rectangleGradient2(renderer.bounds.min.x, renderer.bounds.min.y, renderer.bounds.max.x, renderer.bounds.min.y + EDIT_MODE.GRADIENT_HEIGHT, PALETTE_RGB.KITCHN_EDITMODE_GRADIENT_1.with({ w: t }), PALETTE_RGB.KITCHN_EDITMODE_GRADIENT_2, Vec2.UP);
        draw.rectangleGradient2(renderer.bounds.min.x, renderer.bounds.max.y, renderer.bounds.max.x, renderer.bounds.max.y - EDIT_MODE.GRADIENT_HEIGHT, PALETTE_RGB.KITCHN_EDITMODE_GRADIENT_1.with({ w: t }), PALETTE_RGB.KITCHN_EDITMODE_GRADIENT_2, Vec2.UP);
        draw.rectangleStroke(...bounds.shrink({ x: 0, y: wave }).toArray(), color, 10);

        draw.fontSize = 64;
        await draw.textAlign(bounds.min.add({ x: 250, y: 50 }), '編集モード', Vec2.ZERO, color);
        draw.fontSize = 32;
        await draw.textAlign(bounds.min.add({ x: 250, y: 124 }), 'すべてのものを動かせます', Vec2.ZERO, color);
    }

    private async renderOverlaySideVertical(assets: SceneAssetsCommon, layout: SceneLayout) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, states, renderer } = this.game;
        const { OFFSETS } = SCENE_CONFIG;

        const counterHeight = assets.texCounter.height / renderer.scale;
        const { min, max } = layout.kitchenOptions.bounds;

        draw.texture(min.x, min.y + OFFSETS.OVERLAY.KITCHEN_TEX_Y_VERTICAL, max.x, max.y + OFFSETS.OVERLAY.KITCHEN_TEX_Y_VERTICAL, assets.texKitchen);
        itemRenderer.initPass();
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        draw.texture(renderer.bounds.min.x, renderer.bounds.max.y - counterHeight + OFFSETS.OVERLAY.COUNTER_Y_VERTICAL, renderer.bounds.max.x, renderer.bounds.max.y + OFFSETS.OVERLAY.COUNTER_Y_VERTICAL, assets.texCounter);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);

        await itemRenderer.renderHeld();

        await this.game.boardRenderer.render();
        this.particleRenderer.render();
    }

    private async renderOverlaySideHorizontal(assets: SceneAssetsCommon, layout: SceneLayout) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, states, renderer } = this.game;
        const { OFFSETS } = SCENE_CONFIG;

        const counterHeight = assets.texCounter.height / renderer.scale;
        const { min, max } = layout.kitchenOptions.bounds;

        draw.texture(min.x, min.y + OFFSETS.OVERLAY.KITCHEN_TEX_Y_HORIZONTAL, max.x, max.y + OFFSETS.OVERLAY.KITCHEN_TEX_Y_HORIZONTAL, assets.texKitchen);
        itemRenderer.initPass();
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        draw.texture(renderer.bounds.min.x, renderer.bounds.max.y - counterHeight + OFFSETS.OVERLAY.COUNTER_Y_HORIZONTAL, renderer.bounds.max.x, renderer.bounds.max.y + OFFSETS.OVERLAY.COUNTER_Y_HORIZONTAL, assets.texCounter);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);

        await itemRenderer.renderHeld();

        await this.game.boardRenderer.render();
        this.particleRenderer.render();
    }

    private async renderBackgroundSide(assets: SceneAssetsCommon) {
        const { draw } = this.game.pipeline;
        draw.texture(...this.game.renderer.containBounds.toArray(), assets.texBackground);
    }

    private async renderDisplay(scene: SceneKitchenData, assets: SceneAssetsCommon) {
        const counterBounds = CLIENT_WORLD_BOUNDS.fit(assets.texCounter.size);
        this.display.bounds = new AABB2(
            counterBounds.max.sub(SCENE_CONFIG.OFFSETS.DISPLAY.MAX_SUB_1),
            counterBounds.max.sub(SCENE_CONFIG.OFFSETS.DISPLAY.MAX_SUB_2),
        );
        await this.display.render(scene);
    }

    private async processInput(layout: SceneLayout) {
        const { input: eventPipeline } = this.game.pipeline;
        const { item, fridge, input: inputSystem, trashbin, states } = this.game;

        for (const event of eventPipeline) {
            inputSystem.clear();
            item.initPass();

            await fridge.handleInput(event);
            await trashbin.handleInput(event);
            await item.handleMouse(states.counter.value, layout.counterOptions, event);
            await item.handleMouse(states.kitchen.value, layout.kitchenOptions, event);
            this.display.handle(event);

            // 描画プロセス等でキューに積まれたアクションをゲーム側に通知
            if (this.pendingAction) {
                this.game.input.add(this.pendingAction);
            }

            item.endInput();
            await inputSystem.handle(event);
        }
    }

    async handle(scene: SceneKitchenData) {
        const assets = await this.loadAssets();
        const layout = this.game.side === 'client'
            ? KitchenLayoutCalculator.calculateClient(this.game)
            : KitchenLayoutCalculator.calculateOverlay(this.game, assets);

        this.pendingAction = undefined; // イテレーションごとにクリア
        await this.renderScene(assets, layout, scene);
        await this.processInput(layout);
    }
}

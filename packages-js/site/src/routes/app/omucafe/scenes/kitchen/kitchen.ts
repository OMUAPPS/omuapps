import type { GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import { elasticIn } from 'svelte/easing';
import { PALETTE_RGB } from '../../colors';
import { Game } from '../../core/game';
import { CLIENT_RESOLUTION, CLIENT_WORLD_BOUNDS } from '../../core/game-renderer';
import type { Customer, Order, Product } from '../../core/game-state';
import type { Action } from '../../core/input-system';
import type { ItemPool, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import { SCENE_CONFIG, type SceneKitchenData } from './config';
import { Display } from './display';
import asset_vertical_background from './img/asset_vertical_background.png';
import asset_vertical_counter from './img/asset_vertical_counter.png';
import asset_vertical_kitchen from './img/asset_vertical_kitchen.png';
import board from './img/board.png';
import client_counter from './img/client_counter.png';
import client_kitchen from './img/client_kitchen.png';
import ScreenKitchen from './ScreenKitchen.svelte';

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
            kitchenOptions: this.createPoolOptions(game.states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, Vec2.ZERO),
            counterOptions: this.createPoolOptions(game.states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: 0, y: -DESIGN.COUNTER_HEIGHT }),
        };
    }

    static calculateOverlay(game: Game, assets: SceneAssetsCommon): SceneLayout {
        const { renderer, states } = game;
        const { DESIGN, OFFSETS } = SCENE_CONFIG;
        const counterHeight = assets.texCounter.height / renderer.scale;
        const counterOffsetY = renderer.bounds.max.y - counterHeight;
        const centerX = CLIENT_RESOLUTION.x / 2 - DESIGN.COUNTER_WIDTH / 2;

        return {
            center: Vec2.ZERO,
            kitchenOptions: this.createPoolOptions(states.kitchen.value, DESIGN.WIDTH, DESIGN.HEIGHT, { x: centerX, y: OFFSETS.OVERLAY.KITCHEN_Y }),
            counterOptions: this.createPoolOptions(states.counter.value, DESIGN.COUNTER_WIDTH, DESIGN.COUNTER_HEIGHT, { x: centerX, y: counterOffsetY + OFFSETS.OVERLAY.COUNTER_Y }),
        };
    }

    private static createPoolOptions(pool: ItemPool, width: number, height: number, offset: Vec2Like): PoolOptions {
        return {
            pool,
            name: 'キッチン',
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
// 2. 描画ロジックの分離 (Sub Renderers)
// ==========================================

class ParticleRenderer {
    private static readonly COUNT = 3;
    private static readonly DURATION_MS = 8000;

    constructor(private readonly game: Game) {}

    render() {
        if (!this.game.states.config.value.photo.effects.flash) return;

        const { draw } = this.game.pipeline;
        const { renderer } = this.game;
        const elapsed = Timer.now();
        const timeOffset = ParticleRenderer.DURATION_MS / (ParticleRenderer.COUNT + 1);

        for (let index = 0; index < ParticleRenderer.COUNT; index++) {
            const particleElapsed = elapsed + index * timeOffset;
            const particleIndex = Math.floor(particleElapsed / ParticleRenderer.DURATION_MS) * ParticleRenderer.COUNT + index;
            const particleTime = (particleElapsed % ParticleRenderer.DURATION_MS) / ParticleRenderer.DURATION_MS;

            const opacity = Math.sqrt(Math.sin(particleTime * Math.PI));
            const rng = ARC4.fromNumber(particleIndex);
            const pos = renderer.bounds.at({ x: rng.next(), y: rng.next() });
            const scale = rng.next() * 24;

            draw.circle(pos.x + particleTime * 400, pos.y + particleTime * 300 * rng.next(), 0, scale * opacity, Vec4.ONE.with({ w: opacity * 0.1 }));
        }
    }
}

import ch_bulb_1 from './img/characters/bulb_1.png';
import ch_bulb_2 from './img/characters/bulb_2.png';
import ch_kuro_1 from './img/characters/kuro_1.png';
import ch_kuro_2 from './img/characters/kuro_2.png';
import ch_lighter_1 from './img/characters/lighter_1.png';
import ch_lighter_2 from './img/characters/lighter_2.png';

interface Character {
    mute: string;
    speak: string;
}

const CHARACTERS: Character[] = [
    { mute: ch_bulb_1, speak: ch_bulb_2 },
    { mute: ch_kuro_1, speak: ch_kuro_2 },
    { mute: ch_lighter_1, speak: ch_lighter_2 },
];

class CustomerRenderer {
    private static readonly TRANSITION_TIME_MS = 621;
    private static readonly NAMETAG_WIDTH = 375;
    private static readonly NAMETAG_HEIGHT = 210;
    private static readonly AVATAR_SIZE = 96;
    private static readonly POINT_RADIUS = 32;

    constructor(private readonly game: Game) {}

    async render(onActionHovered: (action: Action) => void) {
        const orders = Array.from(this.game.states.orders.values());

        if (orders.length === 0) return;

        const [firstOrder] = orders;
        const customer = this.game.states.customers.get(firstOrder.customer.id);
        if (!customer) return;

        await this.drawCard(customer, firstOrder, onActionHovered);
        await this.drawAvatar(customer, firstOrder);
    }

    private async drawCard(customer: Customer, order: Order, onActionHovered: (action: Action) => void) {
        const { asset } = this.game;
        const { draw, matrices, input } = this.game.pipeline;
        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);

        const elapsed = Timer.now() - order.timestamp;
        const scale = clamp(elapsed / CustomerRenderer.TRANSITION_TIME_MS, 0, 1);

        matrices.model.push();
        matrices.model.scale(1, scale, 1);

        const bounds = AABB2.fromSize({ width: CustomerRenderer.NAMETAG_WIDTH, height: CustomerRenderer.NAMETAG_HEIGHT })
            .scale(1.5).setAt(Vec2.CENTER, { x: -1000, y: -500 });

        this.drawBackground(bounds, draw);
        const [infoBounds, pointsBounds] = bounds.split({ direction: 'y', ratio: 0.6 });

        await this.drawCustomerInfo(infoBounds, customer, asset, draw);
        this.drawPointsSystem(pointsBounds, customer, mouse, draw, onActionHovered);

        matrices.model.pop();
    }

    private async getCustomerAvatar(customer: Customer): Promise<GlTexture> {
        const random = ARC4.fromString(customer.id);
        const character = random.choice(CHARACTERS);
        const time = Timer.now() / 1000 % 4 * 2;
        const index = Math.floor(time);
        const speaking = index === 0;
        const url = speaking ? character.speak : character.mute;
        const asset = this.game.asset.getTextureByUrl(url);
        return (await asset.promise).unwrap.texture;
    }

    private async drawAvatar(customer: Customer, order: Order) {
        const elapsed = Timer.now() - order.timestamp;
        const opacity = clamp(elapsed / CustomerRenderer.TRANSITION_TIME_MS, 0, 1);

        const { draw } = this.game.pipeline;
        const texture = await this.getCustomerAvatar(customer);
        const movementY = Math.sin(elapsed / 1000 * Math.PI) * 10;
        const bounds = AABB2.fromSize(texture).setAt({ x: 0.5, y: 0.5 }, { x: -400, y: -400 + movementY });
        draw.texture(...bounds.toArray(), texture, Vec4.ONE.with({ w: opacity }));
    }

    private drawBackground(bounds: AABB2, draw: any) {
        draw.rectangle(...bounds.offset({ x: 4, y: 32 }).toArray(), PALETTE_RGB.NAMETAG.SHADOW);
        draw.rectangle(...bounds.expand({ x: 2, y: 2 }).toArray(), PALETTE_RGB.NAMETAG.OUTLINE);
        draw.rectangle(...bounds.toArray(), PALETTE_RGB.NAMETAG.BACKGROUND);
    }

    private async drawCustomerInfo(bounds: AABB2, customer: any, asset: any, draw: any) {
        draw.rectangleGradient2(...bounds.toArray(), PALETTE_RGB.NAMETAG.GRADIENT_1, PALETTE_RGB.NAMETAG.GRADIENT_2, Vec2.DOWN);
        draw.fontFamily = 'Zen Maru Gothic';
        draw.fontSize = 18;

        const nameAnchor = bounds.at({ x: 0.1, y: 0.8 });
        await draw.textAlign(bounds.at({ x: 0.1, y: 0.5 }), '名前', { x: 0, y: 0.5 }, PALETTE_RGB.ACCENT);

        draw.fontSize = 32;
        const textMetrics = draw.measureTextActual(customer.user.name);
        await draw.textAlign(nameAnchor, customer.user.name, { x: 0, y: 1 }, PALETTE_RGB.ACCENT);
        draw.rectangle(nameAnchor.x, nameAnchor.y + 2, nameAnchor.x + textMetrics.width, nameAnchor.y + 4, PALETTE_RGB.ACCENT);

        if (customer.user.avatar) {
            const avatarBounds = AABB2.fromSize({ width: CustomerRenderer.AVATAR_SIZE, height: CustomerRenderer.AVATAR_SIZE }).setAt({ x: 0.5, y: 0.5 }, bounds.at({ x: 0.85, y: 0.6 }));
            draw.circle(avatarBounds.center.x, avatarBounds.center.y, 0, CustomerRenderer.AVATAR_SIZE / 2 + 1, PALETTE_RGB.NAMETAG.OUTLINE);
            const avatar = asset.getTextureByUrl(customer.user.avatar);
            if (avatar.type === 'ready') {
                draw.circleTex(avatarBounds.center.x, avatarBounds.center.y, 0, CustomerRenderer.AVATAR_SIZE, avatar.data.texture);
            }
        }

        const titleAnchor = bounds.at({ x: 0.5, y: 0.2 });
        draw.fontSize = 20;
        await draw.textAlign(titleAnchor, this.game.states.shop.value.shop.name, { x: 0.5, y: 1.2 }, PALETTE_RGB.ACCENT);
        draw.fontSize = 32;
        await draw.textAlign(titleAnchor, 'ポイントカード', { x: 0.5, y: -0.2 }, PALETTE_RGB.ACCENT);
    }

    private drawPointsSystem(bounds: AABB2, customer: any, mouse: Vec2, draw: any, onActionHovered: (action: Action) => void) {
        draw.rectangle(bounds.min.x, bounds.min.y, bounds.max.x, bounds.min.y + 1, PALETTE_RGB.NAMETAG.OUTLINE);
        const count = 5;

        for (let index = 0; index < count; index++) {
            const existing = customer.stats.stamps[index];
            const pos = bounds.at({ x: lerp(0.15, 0.85, index / Math.max(1, count - 1)), y: 0.5 });
            const isHovered = pos.distance(mouse) < CustomerRenderer.POINT_RADIUS;

            if (existing) draw.circle(pos.x, pos.y, 0, CustomerRenderer.POINT_RADIUS - 2, PALETTE_RGB.NAMETAG.POINTS_BG);
            draw.circle(pos.x, pos.y, CustomerRenderer.POINT_RADIUS, CustomerRenderer.POINT_RADIUS + 2, isHovered ? Vec4.ONE : PALETTE_RGB.NAMETAG.POINTS_BG);

            if (isHovered) {
                onActionHovered({
                    title: existing ? `${new Date(existing.timestamp).toLocaleString()}に記録 (スタンプを外す)` : 'スタンプを押す',
                    priority: 0,
                    invoke: async () => {
                        customer.stats.stamps[index] = existing ? null : { timestamp: Timer.now() };
                    },
                });
            }
        }
    }
}

class BoardRenderer {
    constructor(private readonly game: Game) {}

    async render() {
        const { draw } = this.game.pipeline;
        const { asset, renderer, states } = this.game;
        const cfg = SCENE_CONFIG.UI.BOARD;

        const boardTex = (await asset.getTextureByUrl(board).promise).unwrap.texture;
        const bounds = AABB2.fromSize(boardTex).scale(1.4).setAt({ x: 0.5, y: 1 }, renderer.bounds.at({ x: 0.5, y: 1 })).offset({ x: 0, y: 100 });
        draw.texture(...bounds.toArray(), boardTex);

        const innerBounds = bounds.shrink({ x: (100 + 20) * 1.4, y: (100 + 30) * 1.4 }).offset({ x: 0, y: -10 * 1.4 }).shrink({ x: 40, y: 40 });
        const products = Array.from(states.products.values()).filter((product) => !product.hidden);
        const pageCount = Math.ceil(products.length / cfg.ITEMS_PER_PAGE);
        const [timer, listBounds] = innerBounds.split({ direction: 'y', ratio: pageCount > 1 ? 0.05 : 0, gap: 10 });
        const [itemTop, itemBottom] = listBounds.split({ direction: 'y', ratio: 0.5, gap: 10 });

        const time = Timer.now();
        const t = time / cfg.DURATION_MS % 1;
        const opacity = Math.pow(Math.min(1, Math.min(Math.abs(t), Math.abs(1 - t)) * 20), 2);
        const pageIndex = Math.floor(time / cfg.DURATION_MS) % pageCount;

        if (pageCount > 1) {
            const [barBounds, timerBounds] = timer.split({ direction: 'x', ratio: 0.9, gap: 10 });
            draw.rectangle(...barBounds.toArray(), PALETTE_RGB.BOARD_TIMER_BG);
            draw.rectangle(...barBounds.with({ max: { x: lerp(barBounds.min.x, barBounds.max.x, 1 - t) } }).toArray(), PALETTE_RGB.BOARD_ACCENT.with({ w: opacity }));
            await draw.textAlign(timerBounds.center, `${pageIndex + 1} / ${pageCount}`, Vec2.CENTER, PALETTE_RGB.BOARD_TEXT);
        }

        const productTop = products[pageIndex * cfg.ITEMS_PER_PAGE];
        const productBottom = products[pageIndex * cfg.ITEMS_PER_PAGE + 1];

        if (productTop) await this.renderBoardEntry(productTop, itemTop, opacity);
        if (productBottom) await this.renderBoardEntry(productBottom, itemBottom, opacity);
    }

    private async renderBoardEntry(product: Product, entryBounds: AABB2, opacity: number) {
        const { itemRenderer, item: itemSystem, pipeline: { draw } } = this.game;
        const item = itemSystem.get(product.itemId);
        if (!item) return;

        draw.rectangle(...entryBounds.toArray(), PALETTE_RGB.BOARD_ENTRY_BG.with({ w: opacity }));
        const [previewBounds, infoBounds] = entryBounds.split({ direction: 'x', ratio: 0.3, gap: 20 });
        const renderState = await itemRenderer.getItemRender(item);

        if (renderState.type === 'rendered') {
            const { renderBounds, texture } = renderState.render;
            draw.texture(...previewBounds.shrink({ x: 40, y: 40 }).fit(renderBounds.size).toArray(), texture, Vec4.ONE.with({ w: opacity }));
        }

        draw.rectangle(previewBounds.max.x - 2, previewBounds.min.y + 20, previewBounds.max.x + 2, previewBounds.max.y - 20, PALETTE_RGB.BOARD_ACCENT);

        const shortestAlias = product.aliases.reduce((shortest, alias) => alias.length < shortest.length ? alias : shortest, product.name);
        await this.drawTextFitWidth(infoBounds.at({ x: 0, y: 0.4 }), product.name, infoBounds.size.x - 40, PALETTE_RGB.BOARD_TEXT.with({ w: opacity }), 54);
        await this.drawTextFitWidth(infoBounds.at({ x: 0, y: 0.7 }), `「#${shortestAlias}」とコメントして注文`, infoBounds.size.x - 40, PALETTE_RGB.BOARD_ACCENT.with({ w: opacity }), 36);
    }

    private async drawTextFitWidth(anchor: Vec2, text: string, maxWidth: number, color: Vec4, fontSize: number) {
        const { draw } = this.game.pipeline;
        draw.fontSize = fontSize;
        const textWidth = draw.measureTextActual(text).width;
        const scale = Math.min(1, maxWidth / textWidth);
        draw.fontSize = fontSize * scale;
        await draw.textAlign(anchor, text, { x: 0, y: 0.5 }, color);
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
    private boardRenderer: BoardRenderer;

    constructor(private readonly game: Game) {
        this.display = new Display(this.game);
        this.particleRenderer = new ParticleRenderer(this.game);
        this.customerRenderer = new CustomerRenderer(this.game);
        this.boardRenderer = new BoardRenderer(this.game);
    }

    private async loadAssets(): Promise<SceneAssetsCommon> {
        if (this.cachedAssets) return this.cachedAssets;

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

    private async renderScene(assets: SceneAssetsCommon, layout: SceneLayout, scene: SceneKitchenData) {
        switch (this.game.side) {
            case 'client':
                await this.renderClientSide(assets, layout, scene);
                break;
            case 'overlay':
                await this.renderOverlaySide(assets, layout);
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
        await this.customerRenderer.render((action) => { this.pendingAction = action; });

        draw.texture(...renderer.bounds.toArray(), assets.texKitchen);

        itemRenderer.initPass();

        const counterTextureBounds = CLIENT_WORLD_BOUNDS.fit(assets.texCounter.size).offset({ x: 0, y: SCENE_CONFIG.OFFSETS.CLIENT.COUNTER_Y });
        draw.texture(...counterTextureBounds.toArray(), assets.texCounter);

        await this.renderDisplay(scene, assets);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        if (!isInEditMode) {
            await trashbin.render(new Vec2(renderer.bounds.max.x - SCENE_CONFIG.OFFSETS.OVERLAY.TRASHBIN_X, renderer.bounds.max.y));
        }
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

    private async renderOverlaySide(assets: SceneAssetsCommon, layout: SceneLayout) {
        const { draw } = this.game.pipeline;
        const { itemRenderer, states, fridge, renderer } = this.game;
        const { OFFSETS } = SCENE_CONFIG;

        const counterHeight = assets.texCounter.height / renderer.scale;
        const { min, max } = layout.kitchenOptions.bounds;

        draw.texture(min.x, min.y + OFFSETS.OVERLAY.KITCHEN_Y, max.x, max.y + OFFSETS.OVERLAY.KITCHEN_Y, assets.texKitchen);
        itemRenderer.initPass();
        await itemRenderer.renderPool(states.kitchen.value, layout.kitchenOptions);

        draw.texture(renderer.bounds.min.x, renderer.bounds.max.y - counterHeight + OFFSETS.OVERLAY.COUNTER_Y, renderer.bounds.max.x, renderer.bounds.max.y + OFFSETS.OVERLAY.COUNTER_Y, assets.texCounter);
        await itemRenderer.renderPool(states.counter.value, layout.counterOptions);

        await fridge.render();
        await itemRenderer.renderHeld();

        await this.boardRenderer.render();
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

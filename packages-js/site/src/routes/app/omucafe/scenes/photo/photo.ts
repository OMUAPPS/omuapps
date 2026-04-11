import type { GlTexture } from '$lib/components/canvas/glcontext';
import { BetterMath } from '$lib/math';
import { AABB2 } from '$lib/math/aabb2';
import { Axis } from '$lib/math/axis';
import { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import type { CanvasOptions } from '../../canvas/canvas';
import { PALETTE_RGB } from '../../colors';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import { ASSET_RESOLUTION, ASSET_WORLD_BOUNDS } from '../../core/game-renderer';
import type { Order, Receipt } from '../../core/game-state';
import { createTransform } from '../../core/transform';
import type { Item, ItemPool, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import asset_vertical_background from './img/asset_vertical_background.png';
import asset_vertical_overlay from './img/asset_vertical_overlay.png';
import background from './img/background.png';
import dummy from './img/dummy.png';
import photo_frame from './img/photo_frame.png';
import ScreenPhoto from './ScreenPhoto.svelte';

// --- Global Constants ---
const DATE_FONT_FAMILY = 'Zen Maru Gothic';
const DATE_FONT_WEIGHT = '600';
const DEFAULT_FONT_FAMILY = 'Noto Sans JP';

// --- Layout & Visual Constants ---
const PHOTO_ROTATION_DEG = -15;
const OVERLAY_ROTATION_DEG = -3;
const PHOTO_SCALE = 1.25;

const ITEM_LAYOUT_SPACE = 400;
const ITEM_LAYOUT_Y_OFFSET = 400;

const CLIENT_CONTAINER_SHRINK = { x: 100, y: 100 };
const OVERLAY_CONTAINER_SHRINK = { x: -150, y: -10 };

const CLIENT_DUMMY_Y_OFFSET = 0;
const CANVAS_GLOW_WIDTH = 6;

const CLIENT_DATE_FONT_SIZE = 42;
const OVERLAY_DATE_FONT_SIZE = 74;
const DATE_TEXT_POSITION = { x: 0.1, y: 0.75 };
const DATE_TEXT_SHADOW_OFFSET = { x: 2, y: 2 };

export interface ScenePhotoData {
    type: 'photo';
    pool: ItemPool;
    receipt?: Receipt;
    photo?: {
        type: 'started';
        startTime: number;
        duration: number;
    } | {
        type: 'failed';
    } | {
        type: 'completed';
        screenshot: Asset;
    };
}

export class ScenePhoto implements SceneHandler<ScenePhotoData> {
    public readonly component = ScreenPhoto;

    constructor(private readonly game: Game) {}

    /**
     * メインハンドラ
     */
    async handle(scene: ScenePhotoData) {
        let poolOptions: PoolOptions | undefined;

        switch (this.game.side) {
            case 'client':
                poolOptions = await this.renderClientSide(scene);
                break;
            case 'background':
                await this.renderBackgroundSide();
                break;
            case 'overlay':
                await this.renderOverlaySide(scene);
                break;
        }

        await this.processInput(scene, poolOptions);
    }

    public openPhotoMode(order?: Order) {
        const pool: ItemPool = { id: 'photo', items: {} };

        this.layoutPoolItems(pool);
        const receipt = this.getOrCreateReceipt(order);

        this.game.startTransition({ type: 'photo', pool, receipt });
    }

    /**
     * カウンター上のアイテムを写真用に配置する
     */
    private layoutPoolItems(pool: ItemPool) {
        const { itemRenderer, item, states } = this.game;
        const counterItems = states.counter.value.items;

        itemRenderer.pushPass();
        itemRenderer.addPool({
            pool,
            name: '写真の下',
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
        });

        const refs = Object.values(counterItems);
        const rootItems = refs.map(ref => item.get(ref.id)).filter(i => i && !i.parent) as Item[];
        const gap = ITEM_LAYOUT_SPACE / rootItems.length;

        for (let index = 0; index < rootItems.length; index++) {
            const targetItem = rootItems[index];
            const x = gap * (index - (rootItems.length - 1) / 2);

            const clone = item.clone(targetItem);
            clone.transform.offset = { x, y: ITEM_LAYOUT_Y_OFFSET };
            item.setPool(clone, pool);
        }
        itemRenderer.popPass();
    }

    private getOrCreateReceipt(order?: Order): Receipt | undefined {
        if (!order) return undefined;
        return this.game.states.receipts.get(order.id) || { id: order.id, order, date: new Date().toISOString() };
    }

    // ------------------------------------------------------------------------
    // Rendering Logic
    // ------------------------------------------------------------------------

    private async renderClientSide(scene: ScenePhotoData): Promise<PoolOptions> {
        const { draw, matrices, input: pipelineInput } = this.game.pipeline;
        const { renderer, asset, itemRenderer } = this.game;
        const { bounds, containBounds } = renderer;

        // 背景の描画 (並列読み込み)
        const [bgAsset, bg2Asset] = await Promise.all([
            asset.getTextureByUrl(client_background).promise,
            asset.getTextureByUrl(background).promise,
        ]);

        draw.texture(...containBounds.toArray(), bgAsset.unwrap.texture);
        draw.rectangle(...bounds.toArray(), PALETTE_RGB.BACKGROUND.with({ w: 0.7 }));
        draw.texture(...bounds.toArray(), bg2Asset.unwrap.texture);

        // 写真フレームのセットアップ
        const container = bounds.with({ max: { x: 0 } }).shrink(CLIENT_CONTAINER_SHRINK);
        const overlayBounds = container.fit(ASSET_RESOLUTION);
        const { photoTex, frameBounds, poolOptions } = await this.setupPhotoFrame(scene.pool, overlayBounds);

        // ダミー配置とアイテム群の描画
        await this.renderDummyBackground(frameBounds);

        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, poolOptions);
        await itemRenderer.renderHeld();

        // 写真フレーム枠の描画
        draw.scissor(overlayBounds);
        await this.drawPhotoFrame(scene, overlayBounds, photoTex, CLIENT_DATE_FONT_SIZE);
        draw.endScissor();

        draw.rectangleStroke(...overlayBounds.toArray(), PALETTE_RGB.PHOTOFRAME_OUTLINE, 25, 'outer');

        // キャンバスの描画
        const mouse = matrices.getViewToModel().transform2(pipelineInput.mouse.pos);
        const localPos = overlayBounds.unmap(mouse).mul(ASSET_RESOLUTION);
        const canvasOptions: CanvasOptions = { pos: localPos, mouse, size: ASSET_RESOLUTION };

        await this.renderCanvas(overlayBounds, canvasOptions, localPos, photoTex, scene.photo == null);

        return poolOptions;
    }

    private async renderBackgroundSide() {
        const { draw } = this.game.pipeline;
        const { containBounds } = this.game.renderer;

        const bgAsset = await this.game.asset.getTextureByUrl(asset_vertical_background).promise;
        draw.texture(...containBounds.toArray(), bgAsset.unwrap.texture);
    }

    private async renderOverlaySide(scene: ScenePhotoData) {
        const { draw, matrices } = this.game.pipeline;
        const { bounds } = this.game.renderer;
        const { itemRenderer } = this.game;

        const container = bounds;
        const { photoTex, frameBounds, poolOptions } = await this.setupPhotoFrame(scene.pool, container);

        // 背景オーバーレイの描画
        const bgAsset = await this.game.asset.getTextureByUrl(asset_vertical_overlay).promise;
        matrices.model.push();
        matrices.model.scale(PHOTO_SCALE, PHOTO_SCALE, 1);
        matrices.model.rotate(Axis.Z_POS.rotateDeg(OVERLAY_ROTATION_DEG));
        draw.texture(...bounds.toArray(), bgAsset.unwrap.texture);
        matrices.model.pop();

        // アイテム群の描画
        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, poolOptions);
        await itemRenderer.renderHeld();

        // 共通のアイテム＆フレーム描画
        await this.drawPhotoFrame(scene, container, photoTex, OVERLAY_DATE_FONT_SIZE);

        // キャンバスの描画 (非インタラクティブ)
        const canvasOptions: CanvasOptions = { pos: Vec2.ZERO, mouse: Vec2.ZERO, size: ASSET_RESOLUTION };
        await this.renderCanvas(ASSET_WORLD_BOUNDS, canvasOptions, Vec2.ZERO, photoTex, false);
    }

    // ------------------------------------------------------------------------
    // Rendering Helpers
    // ------------------------------------------------------------------------

    private async setupPhotoFrame(pool: ItemPool, container: AABB2) {
        const photoAsset = await this.game.asset.getTextureByUrl(photo_frame).promise;
        const photoTex = photoAsset.unwrap.texture;

        const frameBounds = container.fit(photoTex.size);
        const scale = frameBounds.width / photoTex.width * 1.5;

        const transform = Transform2D.IDENTITY
            .translate(frameBounds.center)
            .rotate(BetterMath.toRadians(-PHOTO_ROTATION_DEG / 2))
            .scale(scale);

        const poolOptions: PoolOptions = {
            pool,
            name: '写真の下',
            transform: transform.toJSON(),
            bounds: AABB2.fromSize(photoTex).setAt(Vec2.CENTER, Vec2.ZERO).scale(scale),
            align: Vec2.CENTER,
        };

        return { photoTex, frameBounds, poolOptions };
    }

    private async renderDummyBackground(frameBounds: AABB2) {
        const { draw, matrices } = this.game.pipeline;
        const { asset } = this.game;

        matrices.model.push();
        const center = frameBounds.center;
        matrices.model.translate(center.x, center.y, 0);
        matrices.model.scale(PHOTO_SCALE, PHOTO_SCALE, 1);
        matrices.model.translate(-center.x, -center.y, 0);

        const dummyAsset = await asset.getTextureByUrl(dummy).promise;
        const dummyTex = dummyAsset.unwrap.texture;
        draw.texture(...frameBounds.fit(dummyTex.size).offset({ x: 0, y: CLIENT_DUMMY_Y_OFFSET }).toArray(), dummyTex);

        matrices.model.pop();
    }

    private async drawPhotoFrame(scene: ScenePhotoData, frameBounds: AABB2, photoTex: GlTexture, fontSize: number) {
        const { draw, matrices } = this.game.pipeline;

        matrices.model.push();
        const center = frameBounds.center;
        matrices.model.translate(center.x, center.y, 0);
        matrices.model.scale(1, 1, 1);
        matrices.model.rotate(Axis.Z_POS.rotateDeg(PHOTO_ROTATION_DEG));
        matrices.model.translate(-center.x, -center.y, 0);

        const photoBounds = frameBounds.fit(photoTex.size).setAt({ x: 0.5, y: -0.1 }, { x: frameBounds.center.x, y: frameBounds.min.y });
        draw.texture(...photoBounds.scaleAt(1.2, photoBounds.center).toArray(), photoTex);

        // 日付テキストの描画
        draw.fontFamily = DATE_FONT_FAMILY;
        draw.fontWeight = DATE_FONT_WEIGHT;
        draw.fontSize = fontSize;

        const date = scene.receipt?.date ? new Date(scene.receipt.date) : new Date();
        const dateStr = date.toLocaleDateString();
        const textPos = frameBounds.at(DATE_TEXT_POSITION);

        await draw.textAlign(textPos.add(DATE_TEXT_SHADOW_OFFSET), dateStr, Vec2.UP, PALETTE_RGB.PHOTOFRAME_TEXT_SHADOW);
        await draw.textAlign(textPos, dateStr, Vec2.UP, PALETTE_RGB.PHOTOFRAME_TEXT);

        draw.fontFamily = DEFAULT_FONT_FAMILY;
        matrices.model.pop();
    }

    private async renderCanvas(frameBounds: AABB2, options: CanvasOptions, localPos: Vec2, tex: GlTexture, isInteractive: boolean) {
        const { draw } = this.game.pipeline;
        const { canvas } = this.game;

        if (isInteractive) {
            canvas.updateInput(options);
        }

        const canvasRender = await canvas.render(options);
        draw.textureOutline(...frameBounds.toArray(), canvasRender, PALETTE_RGB.CANVAS_GLOW, CANVAS_GLOW_WIDTH);
        draw.texture(...frameBounds.toArray(), canvasRender);

        if (isInteractive) {
            const isHovered = localPos.x > 0 && localPos.y > 0 && localPos.x < ASSET_RESOLUTION.x && localPos.y < ASSET_RESOLUTION.y;
            if (isHovered) {
                canvas.renderCursor(options);
            }
        }
    }

    // ------------------------------------------------------------------------
    // Input Handling
    // ------------------------------------------------------------------------

    private async processInput(scene?: ScenePhotoData, poolOptions?: PoolOptions) {
        const { input: eventPipeline } = this.game.pipeline;
        const { input, item, states } = this.game;

        const isMoveTool = states.config.value.canvas.tool?.type === 'move' && !scene?.photo;

        for (const event of eventPipeline) {
            input.clear();
            item.initPass();

            if (isMoveTool && scene && poolOptions) {
                await item.handleMouse(scene.pool, poolOptions, event);
            }

            item.endInput();
            await input.handle(event);
        }
    }
}

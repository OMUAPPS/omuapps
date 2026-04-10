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
import type { Order, Receipt } from '../../core/game-state';
import { createTransform } from '../../core/transform';
import type { Item, ItemPool, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import asset_vertical_background from '../kitchen/img/asset_vertical_background.png';
import type { SceneHandler } from '../scene';
import dummy from './img/dummy.png';
import photo_frame from './img/photo_frame.png';
import ScreenPhoto from './ScreenPhoto.svelte';

// --- Constants ---
const PHOTO_ROTATION_DEG = -10;
const DATE_FONT_FAMILY = 'Zen Maru Gothic';
const DATE_FONT_WEIGHT = '500';
const DEFAULT_FONT_FAMILY = 'Noto Sans JP';

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

        // 入力処理を一箇所に集約
        await this.processInput(scene, poolOptions);
    }

    public openPhotoMode(order?: Order) {
        const pool: ItemPool = { id: 'photo', items: {} };
        const counterItems = this.game.states.counter.value.items;
        const { itemRenderer, item } = this.game;

        itemRenderer.pushPass();
        itemRenderer.addPool({
            pool,
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
        });

        const refs = Object.values(counterItems);
        const space = 400;
        const rootItems = refs.map(ref => item.get(ref.id)).filter(i => i && !i.parent) as Item[];
        const gap = space / rootItems.length;
        for (let index = 0; index < rootItems.length; index++) {
            const targetItem = rootItems[index];
            const x = gap * (index - (rootItems.length - 1) / 2);

            const clone = item.clone(targetItem);
            clone.transform.offset = { x: x, y: 400 };
            item.setPool(clone, pool);
        }
        itemRenderer.popPass();

        // Receiptの取得・生成を簡略化
        const receipt: Receipt | undefined = order && (
            this.game.states.receipts.get(order.id) || { id: order.id, order, date: new Date().toISOString() }
        );

        this.game.startTransition({ type: 'photo', pool, receipt });
    }

    private async renderClientSide(scene: ScenePhotoData): Promise<PoolOptions> {
        const { draw, matrices, input: pipelineInput } = this.game.pipeline;
        const { renderer, asset, canvas } = this.game;
        const { bounds, containBounds } = renderer;

        // 背景の描画
        const bgAsset = await asset.getTextureByUrl(client_background).promise;
        draw.texture(...containBounds.toArray(), bgAsset.unwrap.texture);

        draw.rectangle(...bounds.toArray(), PALETTE_RGB.BACKGROUND.with({ w: 0.7 }));
        draw.rectangle(...bounds.with({ min: { x: 0 } }).toArray(), PALETTE_RGB.BACKGROUND.with({ w: 0.9 }));

        // 写真フレームと描画オプションのセットアップ
        const container = bounds.with({ max: { x: 0 } }).shrink({ x: 100, y: 100 });
        const { photoTex, frameBounds, poolOptions } = await this.setupPhotoFrame(scene.pool, container);

        await this.drawPhotoItemsAndFrame(scene, poolOptions, frameBounds, photoTex, 42);

        // フレーム内キャンバスの描画
        const mouse = matrices.getViewToModel().transform2(pipelineInput.mouse.pos);
        const pos = frameBounds.unmap(mouse).mul(photoTex.size);
        const canvasOptions: CanvasOptions = { pos, mouse, size: photoTex.size };

        if (!scene.photo) {
            canvas.updateInput(canvasOptions);
        }
        const canvasRender = await canvas.render(canvasOptions);
        draw.textureOutline(...frameBounds.toArray(), canvasRender, PALETTE_RGB.CANVAS_GLOW, 6);
        draw.texture(...frameBounds.toArray(), canvasRender);

        const isHovered = pos.x > 0 && pos.y > 0 && pos.x < photoTex.width && pos.y < photoTex.height;
        if (isHovered) {
            canvas.renderCursor(canvasOptions);
        }

        matrices.model.pop();

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
        const { canvas } = this.game;

        const container = bounds.offset({ x: 0, y: bounds.min.y / 8 }).shrink({ x: -50, y: 100 });
        const { photoTex, frameBounds, poolOptions } = await this.setupPhotoFrame(scene.pool, container);

        // 共通のアイテム＆フレーム描画 (フォントサイズ指定: 74)
        await this.drawPhotoItemsAndFrame(scene, poolOptions, frameBounds, photoTex, 74);

        // キャンバスの描画
        const canvasOptions: CanvasOptions = { pos: Vec2.ZERO, mouse: Vec2.ZERO, size: photoTex.size };
        const canvasRender = await canvas.render(canvasOptions);
        draw.textureOutline(...frameBounds.toArray(), canvasRender, PALETTE_RGB.CANVAS_GLOW, 6);
        draw.texture(...frameBounds.toArray(), canvasRender);

        matrices.model.pop();
    }

    /**
     * 写真フレームの設定と PoolOptions の共通生成ロジック
     */
    private async setupPhotoFrame(pool: ItemPool, container: AABB2) {
        const photoAsset = await this.game.asset.getTextureByUrl(photo_frame).promise;
        const photoTex = photoAsset.unwrap.texture;

        const frameBounds = container.fit(photoTex.size);
        const scale = frameBounds.width / photoTex.width;

        const transform = Transform2D.IDENTITY
            .translate(frameBounds.center)
            .rotate(BetterMath.toRadians(PHOTO_ROTATION_DEG))
            .scale(scale);

        const poolOptions: PoolOptions = {
            pool,
            transform: transform.toJSON(),
            bounds: AABB2.fromSize(photoTex).setAt(Vec2.CENTER, Vec2.ZERO),
            align: Vec2.CENTER,
        };

        return { photoTex, frameBounds, poolOptions };
    }

    private async drawPhotoItemsAndFrame(
        scene: ScenePhotoData,
        poolOptions: PoolOptions,
        frameBounds: AABB2,
        photoTex: GlTexture,
        fontSize: number,
    ) {
        const { draw, matrices } = this.game.pipeline;
        const { itemRenderer, asset } = this.game;

        if (this.game.side === 'client') {
            matrices.model.push();
            const center = frameBounds.center;
            matrices.model.translate(center.x, center.y, 0);
            matrices.model.rotate(Axis.Z_POS.rotateDeg(-PHOTO_ROTATION_DEG));
            matrices.model.scale(1.2, 1.2, 1);
            matrices.model.translate(-center.x, -center.y, 0);
            const dummyAsset = await asset.getTextureByUrl(dummy).promise;
            const dummyTex = dummyAsset.unwrap.texture;
            draw.texture(...frameBounds.fit(dummyTex.size).offset({ x: 0, y: 50 }).toArray(), dummyTex);
            matrices.model.pop();
        }

        // アイテム群の描画
        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, poolOptions);
        await itemRenderer.renderHeld();

        matrices.model.push();
        if (this.game.side !== 'client') {
            const center = frameBounds.center;
            matrices.model.translate(center.x, center.y, 0);
            matrices.model.rotate(Axis.Z_POS.rotateDeg(PHOTO_ROTATION_DEG));
            matrices.model.translate(-center.x, -center.y, 0);
        }

        draw.texture(...frameBounds.toArray(), photoTex);

        // 日付テキストの描画
        draw.fontFamily = DATE_FONT_FAMILY;
        draw.fontWeight = DATE_FONT_WEIGHT;
        draw.fontSize = fontSize;
        const date = scene.receipt?.date ? new Date(scene.receipt?.date) : new Date();
        await draw.textAlign(frameBounds.at({ x: 0.9, y: 0.75 }), date.toLocaleDateString(), Vec2.ONE, PALETTE_RGB.PHOTOFRAME_TEXT);
        draw.fontFamily = DEFAULT_FONT_FAMILY;
    }

    /**
     * パイプラインイベントの入力処理
     */
    private async processInput(scene?: ScenePhotoData, poolOptions?: PoolOptions) {
        const { input: eventPipeline } = this.game.pipeline;
        const { input, item, states } = this.game;

        const isMoveTool = states.config.value.canvas.tool?.type === 'move' && !scene?.photo;

        for (const event of eventPipeline) {
            input.clear();
            item.initPass();

            // クライアントサイドなど、必要な情報が揃っている場合のみマウスハンドリングを実行
            if (isMoveTool && scene && poolOptions) {
                await item.handleMouse(scene.pool, poolOptions, event);
            }

            item.endInput();
            await input.handle(event);
        }
    }
}

import type { GlContext, GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { BetterMath } from '$lib/math';
import { AABB2 } from '$lib/math/aabb2';
import { Axis } from '$lib/math/axis';
import { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
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
import flash from './img/flash.png';
import photo_frame from './img/photo_frame.png';
import ScreenPhoto from './ScreenPhoto.svelte';

// ==========================================
// Constants
// ==========================================

// --- Typography ---
const FONT = {
    DATE_FAMILY: 'Zen Maru Gothic',
    DATE_WEIGHT: '600',
    DEFAULT_FAMILY: 'Noto Sans JP',
    CLIENT_DATE_SIZE: 42,
    OVERLAY_DATE_SIZE: 74,
} as const;

// --- Layout & Transforms ---
const LAYOUT = {
    PHOTO_ROTATION_DEG: -15,
    OVERLAY_ROTATION_DEG: -3,
    PHOTO_SCALE: 1.25,
    ITEM_SPACE: 400,
    ITEM_Y_OFFSET: 400,
    CLIENT_CONTAINER_SHRINK: { x: 100, y: 100 },
    CLIENT_DUMMY_Y_OFFSET: 0,
    DATE_TEXT_POSITION: { x: 0.25, y: 0.85 },
    DATE_TEXT_SHADOW_OFFSET: { x: 2, y: 2 },
} as const;

// --- Visual Effects ---
const FX = {
    CANVAS_GLOW_WIDTH: 6,
    BLOOM_RADIUS: 32,
    FLASH_COUNT: 2,
    FLASH_DURATION_MS: 3000,
} as const;

// ==========================================
// Interfaces
// ==========================================

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

interface EffectTarget {
    buffer: GlFramebuffer;
    texture: GlTexture;
}

// ==========================================
// Class Definition
// ==========================================

export class ScenePhoto implements SceneHandler<ScenePhotoData> {
    public readonly component = ScreenPhoto;

    private readonly effectA: EffectTarget;
    private readonly effectB: EffectTarget;
    private readonly effectC: EffectTarget;

    constructor(private readonly game: Game) {
        const { context } = game.pipeline;
        // 重複していたバッファ生成処理をヘルパー化してスッキリ初期化
        this.effectA = this.createEffectTarget(context);
        this.effectB = this.createEffectTarget(context);
        this.effectC = this.createEffectTarget(context);
    }

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

    public async openPhotoMode(order?: Order) {
        const pool: ItemPool = { id: 'photo', items: {} };

        await this.layoutPoolItems(pool);
        const receipt = this.getOrCreateReceipt(order);

        this.game.addTask(async () => {
            this.game.startTransition({ type: 'photo', pool, receipt }, {
                title: '',
                duration: 1000,
            });
        });
    }

    // ------------------------------------------------------------------------
    // Setup & Layout
    // ------------------------------------------------------------------------

    private async layoutPoolItems(pool: ItemPool) {
        const { itemRenderer, item, states } = this.game;
        const counterItems = states.counter.value.items;

        itemRenderer.pushPass();
        itemRenderer.addPool({
            pool,
            name: '写真の下',
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
            ordering: 'latest',
        });

        const refs = Object.values(counterItems);
        const rootItems = refs.map(ref => item.get(ref.id)).filter(i => i && !i.parent) as Item[];
        const gap = LAYOUT.ITEM_SPACE / rootItems.length;

        for (let index = 0; index < rootItems.length; index++) {
            const targetItem = rootItems[index];
            const x = gap * (index - (rootItems.length - 1) / 2);

            const clone = item.clone(targetItem);
            clone.transform.offset = { x, y: LAYOUT.ITEM_Y_OFFSET };
            item.setPool(clone, pool);
        }

        for (const item of rootItems) {
            while (true) {
                const result = await itemRenderer.getItemRender(item);
                if (result.type === 'rendered') {
                    break;
                }
            }
        }
        itemRenderer.popPass();
    }

    private getOrCreateReceipt(order?: Order): Receipt | undefined {
        if (!order) return undefined;
        return this.game.states.receipts.get(order.id) || { id: order.id, order, date: new Date().toISOString() };
    }

    private createEffectTarget(context: GlContext): EffectTarget {
        const buffer = context.createFramebuffer();
        const texture = context.createTexture();
        texture.use(() => {
            texture.setImage(null, {
                width: 4,
                height: 4,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            texture.setParams({
                magFilter: 'linear',
                minFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        buffer.use(() => {
            buffer.attachTexture(texture);
        });
        return { buffer, texture };
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
        const container = bounds.with({ max: { x: 0 } }).shrink(LAYOUT.CLIENT_CONTAINER_SHRINK);
        const overlayBounds = container.fit(ASSET_RESOLUTION);
        const { photoTex, frameBounds, poolOptions } = await this.setupPhotoFrame(scene.pool, overlayBounds);

        // ダミー配置とアイテム群の描画
        await this.renderDummyBackground(frameBounds);

        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, poolOptions);
        await itemRenderer.renderHeld();

        // 写真フレーム枠の描画
        draw.scissor(overlayBounds);

        await this.renderFlashes(overlayBounds, 0.5);

        await this.drawPhotoFrame(scene, overlayBounds, photoTex, FONT.CLIENT_DATE_SIZE);
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
        const { bloom } = this.game.states.config.value.photo.effects;
        const { context, draw, matrices } = this.game.pipeline;
        const { bounds } = this.game.renderer;
        const { itemRenderer } = this.game;

        const { photoTex, poolOptions } = await this.setupPhotoFrame(scene.pool, bounds);

        // エフェクトテクスチャのサイズ同期
        [this.effectA, this.effectB, this.effectC].forEach(effect => {
            effect.texture.use(() => effect.texture.ensureSize(...bounds.size.toArray()));
        });

        const { gl, stateManager } = context;

        // パス1: アイテムと背景オーバーレイの描画
        await this.effectA.buffer.useAsync(async () => {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            gl.clearColor(0, 0, 0, 0);
            stateManager.pushViewport(bounds.size);

            const bgAsset = await this.game.asset.getTextureByUrl(asset_vertical_overlay).promise;
            matrices.model.scope(() => {
                matrices.model.scale(LAYOUT.PHOTO_SCALE, LAYOUT.PHOTO_SCALE, 1);
                matrices.model.rotate(Axis.Z_POS.rotateDeg(LAYOUT.OVERLAY_ROTATION_DEG));
                draw.texture(...bounds.offset({ x: 0, y: 200 }).toArray(), bgAsset.unwrap.texture);
            });

            itemRenderer.initPass();
            await itemRenderer.renderPool(scene.pool, poolOptions);
            await itemRenderer.renderHeld();

            stateManager.popViewport();
        });

        draw.texture(...bounds.toArray({ flipY: true }), this.effectA.texture);

        if (bloom) {
            // パス2: 輝度抽出
            await this.effectB.buffer.useAsync(async () => {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.clearColor(0, 0, 0, 0);
                stateManager.pushViewport(bounds.size);

                draw.thresholdTexture(...bounds.toArray({ flipY: true }), this.effectA.texture, 0.95);

                await this.renderFlashes(this.game.renderer.bounds, 1);

                stateManager.popViewport();
            });

            // パス3: ブルーム (X方向)
            this.effectC.buffer.use(() => {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.clearColor(0, 0, 0, 0);
                stateManager.pushViewport(bounds.size);

                draw.blurTextureStep(...bounds.toArray(), this.effectB.texture, FX.BLOOM_RADIUS, { x: 1, y: 0 });

                stateManager.popViewport();
            });

            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
            draw.blurTextureStep(...bounds.toArray(), this.effectC.texture, FX.BLOOM_RADIUS, { x: 0, y: 1 }, Vec4.ONE.with({ w: 0.75 }));
            this.game.renderer.resetBlending();
        }

        await this.renderFlashes(this.game.renderer.bounds, 1);

        // 共通のアイテム＆フレーム描画
        await this.drawPhotoFrame(scene, bounds, photoTex, FONT.OVERLAY_DATE_SIZE);

        // キャンバスの描画 (非インタラクティブ)
        const canvasOptions: CanvasOptions = { pos: Vec2.ZERO, mouse: Vec2.ZERO, size: ASSET_RESOLUTION };
        await this.renderCanvas(ASSET_WORLD_BOUNDS, canvasOptions, Vec2.ZERO, photoTex, false);
    }

    private async renderFlashes(bounds: AABB2, scaleMultiplier: number) {
        if (!this.game.states.config.value.photo.effects.flash) return;
        const { draw, matrices } = this.game.pipeline;
        const flashAsset = await this.game.asset.getTextureByUrl(flash).promise;
        const flashTex = flashAsset.unwrap.texture;

        const count = FX.FLASH_COUNT;
        const duration = FX.FLASH_DURATION_MS;
        const elapsed = Timer.now();
        const timeOffset = duration / (count + 1);

        for (let index = 0; index < count; index++) {
            const particleElapsed = elapsed + index * timeOffset;
            const particleIndex = Math.floor(particleElapsed / duration) * count + index;
            const particleTime = (particleElapsed % duration) / duration;

            const opacity = Math.sqrt(Math.sin(particleTime * Math.PI));
            const rng = ARC4.fromNumber(particleIndex);

            const pos = bounds.at({ x: rng.next(), y: rng.next() });
            const scale = rng.next() * 2 * scaleMultiplier;
            const rotation = rng.next() * 3 + 15;

            matrices.model.scope(() => {
                matrices.model.rotate(Axis.Z_POS.rotateDeg(rotation));
                matrices.model.translate(pos.x, pos.y, 0);
                matrices.model.scale(scale * opacity, scale * opacity, 1);

                const w2 = flashTex.width / 2;
                const h2 = flashTex.height / 2;
                draw.texture(-w2, -h2, w2, h2, flashTex, Vec4.ONE.with({ w: opacity }));
            });
        }
    }

    // ------------------------------------------------------------------------
    // Rendering Helpers
    // ------------------------------------------------------------------------

    private async setupPhotoFrame(pool: ItemPool, container: AABB2) {
        const photoAsset = await this.game.asset.getTextureByUrl(photo_frame).promise;
        const photoTex = photoAsset.unwrap.texture;

        const frameBounds = container.fit(photoTex.size);
        const scale = frameBounds.width / photoTex.width;

        const transform = Transform2D.IDENTITY
            .translate(frameBounds.center)
            .rotate(BetterMath.toRadians(-LAYOUT.PHOTO_ROTATION_DEG / 2))
            .scale(scale);

        const poolOptions: PoolOptions = {
            pool,
            name: '写真の下',
            transform: transform.toJSON(),
            bounds: AABB2.fromSize(photoTex).setAt(Vec2.CENTER, Vec2.ZERO).scale(scale * 1.5),
            align: Vec2.CENTER,
            ordering: 'latest',
        };

        return { photoTex, frameBounds, poolOptions };
    }

    private async renderDummyBackground(frameBounds: AABB2) {
        const { draw, matrices } = this.game.pipeline;
        const { asset } = this.game;

        matrices.model.push();
        const center = frameBounds.center;
        matrices.model.translate(center.x, center.y, 0);
        matrices.model.scale(LAYOUT.PHOTO_SCALE, LAYOUT.PHOTO_SCALE, 1);
        matrices.model.translate(-center.x, -center.y, 0);

        const dummyAsset = await asset.getTextureByUrl(dummy).promise;
        const dummyTex = dummyAsset.unwrap.texture;
        draw.texture(...frameBounds.fit(dummyTex.size).offset({ x: 0, y: LAYOUT.CLIENT_DUMMY_Y_OFFSET }).toArray(), dummyTex);

        matrices.model.pop();
    }

    private async drawPhotoFrame(scene: ScenePhotoData, frameBounds: AABB2, photoTex: GlTexture, fontSize: number) {
        if (!this.game.states.config.value.photo.frame) return;
        const { draw, matrices } = this.game.pipeline;

        matrices.model.push();
        const center = frameBounds.center;
        matrices.model.translate(center.x, center.y, 0);
        matrices.model.scale(1, 1, 1);
        matrices.model.rotate(Axis.Z_POS.rotateDeg(LAYOUT.PHOTO_ROTATION_DEG));
        matrices.model.translate(-center.x, -center.y, 0);

        const photoBounds = frameBounds.fit(photoTex.size).setAt({ x: 0.5, y: -0.1 }, { x: frameBounds.center.x, y: frameBounds.min.y });
        draw.texture(...photoBounds.scaleAt(1.25, photoBounds.center).toArray(), photoTex, Vec4.ONE.with({ w: this.game.side === 'client' ? 0.8 : 1 }));

        // 日付テキストの描画
        draw.fontFamily = FONT.DATE_FAMILY;
        draw.fontWeight = FONT.DATE_WEIGHT;
        draw.fontSize = fontSize;

        const date = scene.receipt?.date ? new Date(scene.receipt.date) : new Date();
        const dateStr = date.toLocaleDateString();
        const textPos = frameBounds.at(LAYOUT.DATE_TEXT_POSITION);

        await draw.textAlign(textPos.add(LAYOUT.DATE_TEXT_SHADOW_OFFSET), dateStr, Vec2.UP, PALETTE_RGB.PHOTOFRAME_TEXT_SHADOW);
        await draw.textAlign(textPos, dateStr, Vec2.UP, PALETTE_RGB.PHOTOFRAME_TEXT);

        draw.fontFamily = FONT.DEFAULT_FAMILY;
        matrices.model.pop();
    }

    private async renderCanvas(frameBounds: AABB2, options: CanvasOptions, localPos: Vec2, tex: GlTexture, isInteractive: boolean) {
        const { draw } = this.game.pipeline;
        const { canvas } = this.game;

        if (isInteractive) {
            canvas.updateInput(options);
        }

        const canvasRender = await canvas.render(options);
        draw.textureOutline(...frameBounds.toArray(), canvasRender, PALETTE_RGB.CANVAS_GLOW, FX.CANVAS_GLOW_WIDTH);
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

import { BetterMath } from '$lib/math';
import { AABB2 } from '$lib/math/aabb2';
import { Axis } from '$lib/math/axis';
import { Transform2D } from '$lib/math/transform2d';
import { Vec2 } from '$lib/math/vec2';
import type { CanvasOptions } from '../../canvas/canvas';
import { PALETTE_RGB } from '../../colors';
import type { Game } from '../../core/game';
import { createTransform } from '../../core/transform';
import type { ItemPool, ItemRef, PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import ScreenPhoto from './ScreenPhoto.svelte';
import photo_frame from './img/photo_frame.png';

export interface ScenePhotoData {
    type: 'photo';
    pool: ItemPool;
}

export class ScenePhoto implements SceneHandler<ScenePhotoData> {
    public readonly component = ScreenPhoto;

    constructor(private readonly game: Game) {}

    /**
     * メインハンドラ
     */
    async handle(scene: ScenePhotoData) {
        if (this.game.side === 'client') {
            await this.renderClientSide(scene);
        } else if (this.game.side === 'background') {
            await this.renderBackgroundSide();
        } else if (this.game.side === 'overlay') {
            await this.renderOverlaySide(scene);
        }

        await this.processInput();
    }

    public openPhotoMode() {
        const items: Record<string, ItemRef> = {};
        const pool: ItemPool = { id: 'photo', items };
        const counterItems = this.game.states.counter.value.items;

        this.game.itemRenderer.pushPass();
        this.game.itemRenderer.addPool({
            pool,
            align: Vec2.ZERO,
            bounds: AABB2.ZEROONE,
            transform: createTransform(),
        });
        // Object.values を使用してシンプルに反復処理
        for (const ref of Object.values(counterItems)) {
            const item = this.game.item.get(ref.id);
            if (!item || item.parent) continue;

            const clone = this.game.item.clone(item);
            clone.transform.offset = { x: 0, y: 0 };
            this.game.item.setPool(clone, pool);
        }
        this.game.itemRenderer.popPass();

        this.game.startTransition({
            type: 'photo',
            pool,
        });
    }

    private async renderClientSide(scene: ScenePhotoData) {
        const { draw, matrices, input: pipelineInput } = this.game.pipeline;
        const { renderer, itemRenderer, asset, canvas } = this.game;
        const { bounds, containBounds } = renderer;

        // 背景の描画
        const bgAsset = await asset.getTextureByUrl(client_background).promise;
        draw.texture(...containBounds.toArray(), bgAsset.unwrap.texture);

        draw.rectangle(...bounds.toArray(), PALETTE_RGB.BACKGROUND.with({ w: 0.7 }));
        draw.rectangle(...bounds.with({ min: { x: 0 } }).toArray(), PALETTE_RGB.BACKGROUND.with({ w: 0.9 }));

        // 写真フレームの描画
        const photoAsset = await asset.getTextureByUrl(photo_frame).promise;
        const photoTex = photoAsset.unwrap.texture;

        const container = bounds.with({ max: { x: 0 } }).shrink({ x: 100, y: 100 });
        const frameBounds = container.fit(photoTex.size);
        const scale = frameBounds.width / photoTex.width;

        // アイテム群の描画
        const transform = Transform2D.IDENTITY.rotate(BetterMath.toRadians(3)).translate(frameBounds.center).scale(scale);
        const options: PoolOptions = {
            pool: scene.pool,
            transform: transform.toJSON(),
            bounds: AABB2.fromSize(photoTex).setAt(Vec2.CENTER, Vec2.ZERO),
            align: Vec2.CENTER,
        };

        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, options);
        await itemRenderer.renderHeld();

        matrices.model.push();
        matrices.model.rotate(Axis.Z_POS.rotateDeg(3));
        draw.texture(...frameBounds.toArray(), photoTex);

        // フレーム内キャンバスの描画
        const mouse = matrices.getViewToModel().transform2(pipelineInput.mouse.pos);
        const pos = frameBounds.unmap(mouse).mul(photoTex.size);
        const canvasOptions: CanvasOptions = { pos, mouse, size: photoTex.size };

        // 呼び出し元で既に client 判定されているためチェックを省略
        canvas.updateInput(canvasOptions);
        const canvasRender = await canvas.render(canvasOptions);

        draw.texture(...frameBounds.toArray(), canvasRender);
        canvas.renderCursor(canvasOptions);
        matrices.model.pop();

        const { input: eventPipeline } = this.game.pipeline;
        const { item, input: inputSystem } = this.game;

        for (const event of eventPipeline) {
            inputSystem.clear();
            item.initPass();

            // 判定は手前にあるものから順に行う
            if (this.game.states.config.value.canvas.tool?.type === 'move') {
                await item.handleMouse(scene.pool, options, event);
            }

            item.endInput();
            await inputSystem.handle(event);
        }
    }

    private async renderBackgroundSide() {
        const { draw } = this.game.pipeline;
        const { containBounds } = this.game.renderer;

        const bgAsset = await this.game.asset.getTextureByUrl(client_background).promise;
        draw.texture(...containBounds.toArray(), bgAsset.unwrap.texture);
    }

    private async renderOverlaySide(scene: ScenePhotoData) {
        const { draw, matrices } = this.game.pipeline;
        const { bounds } = this.game.renderer;

        const photoAsset = await this.game.asset.getTextureByUrl(photo_frame).promise;
        const photoTex = photoAsset.unwrap.texture;

        const container = bounds.offset({ x: 0, y: bounds.min.y / 8 }).shrink({ x: -50, y: 100 });
        const frameBounds = container.fit(photoTex.size);
        const scale = frameBounds.width / photoTex.width;

        // アイテム群の描画
        const transform = Transform2D.IDENTITY.rotate(BetterMath.toRadians(3)).translate(frameBounds.center).scale(scale);
        const options: PoolOptions = {
            pool: scene.pool,
            transform: transform.toJSON(),
            bounds: AABB2.fromSize(photoTex).setAt(Vec2.CENTER, Vec2.ZERO),
            align: Vec2.CENTER,
        };

        const { itemRenderer } = this.game;
        itemRenderer.initPass();
        await itemRenderer.renderPool(scene.pool, options);
        await itemRenderer.renderHeld();

        const canvasOptions: CanvasOptions = {
            pos: Vec2.ZERO,
            mouse: Vec2.ZERO,
            size: photoTex.size,
        };

        matrices.model.push();
        matrices.model.rotate(Axis.Z_POS.rotateDeg(3));
        draw.texture(...frameBounds.toArray(), photoTex);

        const canvasRender = await this.game.canvas.render(canvasOptions);
        draw.texture(...frameBounds.toArray(), canvasRender);
        matrices.model.pop();
    }

    private async processInput() {
        const { input: eventPipeline } = this.game.pipeline;
        const { input, item } = this.game;

        for (const event of eventPipeline) {
            input.clear();
            item.initPass();
            item.endInput();

            await input.handle(event);
        }
    }
}

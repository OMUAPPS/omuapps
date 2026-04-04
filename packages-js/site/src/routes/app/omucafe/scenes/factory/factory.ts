import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import { get, writable } from 'svelte/store';
import type { Game } from '../../core/game';
import { DEFAULT_TRANSFORM } from '../../core/transform';
import { type ItemPool, type PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import factory_bg from './img/factory.png';
import ScreenCreator from './ScreenFactory.svelte';

export interface SceneFactoryData {
    type: 'factory';
    itemId?: string;
}

export const preview = writable<{
    itemId: string;
    update: number;
    url: string;
} | undefined>();

// アセットデータの型定義
interface SceneAssets {
    texBackground: GlTexture;
    texFactory: GlTexture;
}

/** 描画用の定数 */
const OFFSETS = {
    TRASHBIN_X: 400,
} as const;

export class SceneFactory implements SceneHandler<SceneFactoryData> {
    public readonly component = ScreenCreator;
    private readonly pool: ItemPool;
    private readonly readBuffer: GlFramebuffer;
    private cachedAssets: SceneAssets | null = null; // アセットのキャッシュ

    constructor(private readonly game: Game) {
        this.pool = game.states.factory.value;
        this.readBuffer = game.pipeline.context.createFramebuffer();
    }

    /**
     * アセットのロードとキャッシュ
     */
    private async loadAssets(): Promise<SceneAssets> {
        if (this.cachedAssets) {
            return this.cachedAssets;
        }

        const [bg, factory] = await Promise.all([
            this.game.asset.getTextureByUrl(client_background).promise,
            this.game.asset.getTextureByUrl(factory_bg).promise,
        ]);

        this.cachedAssets = {
            texBackground: bg.unwrap.texture,
            texFactory: factory.unwrap.texture,
        };

        return this.cachedAssets;
    }

    /**
     * プールオプションの共通生成ロジック
     */
    private getPoolOptions(): PoolOptions {
        const { resolution } = this.game.renderer;
        return {
            pool: this.pool,
            transform: DEFAULT_TRANSFORM,
            bounds: new AABB2(
                new Vec2(-resolution.x / 2, 0),
                new Vec2(resolution.x / 2, resolution.y),
            ),
            align: Vec2.UP,
        };
    }

    /**
     * メインハンドラ
     */
    async handle(scene: SceneFactoryData) {
        const isClient = this.game.side === 'client';
        const assets = await this.loadAssets();
        const options = this.getPoolOptions();

        await this.renderScene(scene, assets, options, isClient);
        await this.processInput(options, isClient);
    }

    /**
     * 描画処理 (Client / Overlay 共通)
     */
    private async renderScene(scene: SceneFactoryData, assets: SceneAssets, options: PoolOptions, isClient: boolean) {
        const { draw } = this.game.pipeline;
        const { renderer, itemRenderer, trashbin, fridge } = this.game;

        // 1. 背景の描画
        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);
        draw.texture(...renderer.bounds.fit(assets.texFactory.size).toArray(), assets.texFactory);

        // 2. アイテムプールの描画
        itemRenderer.initPass();
        await itemRenderer.renderPool(this.pool, options);

        // 3. クライアント専用の描画
        if (isClient) {
            await trashbin.render(new Vec2(renderer.bounds.max.x - OFFSETS.TRASHBIN_X, renderer.bounds.max.y));
            await fridge.render();
        }

        // 4. 手に持っているアイテムの描画 (共通)
        await itemRenderer.renderHeld();

        // 5. プレビューの更新 (クライアント専用)
        if (isClient) {
            await this.updatePreview(scene);
        }
    }

    /**
     * 入力処理 (Client / Overlay 共通)
     */
    private async processInput(options: PoolOptions, isClient: boolean) {
        const { input: eventPipeline } = this.game.pipeline;
        const { input, item, fridge, trashbin } = this.game;

        for (const event of eventPipeline) {
            input.clear();
            item.initPass();

            if (isClient) {
                await fridge.handleInput(event);
                await trashbin.handleInput(event);
            }

            await item.handleMouse(this.pool, options, event);
            item.endInput();

            await input.handle(event);
        }
    }

    /**
     * プレビュー画像の更新処理
     */
    private async updatePreview(scene: SceneFactoryData) {
        const previewState = get(preview);

        // 選択アイテムがない場合はクリア
        if (!scene.itemId) {
            if (previewState) {
                if (previewState.url) URL.revokeObjectURL(previewState.url); // メモリリーク対策
                preview.set(undefined);
            }
            return;
        }

        const item = this.game.item.get(scene.itemId);
        if (!item) return;

        // すでに最新のプレビューが生成されている場合はスキップ
        if (previewState && previewState.itemId === scene.itemId && previewState.update === item.update) {
            return;
        }

        const result = await this.game.itemRenderer.getItemRender(item);
        if (result.type !== 'rendered') return;

        // バッファから画像を読み取り Blob URL を生成
        await this.readBuffer.useAsync(async () => {
            const { texture } = result.render;
            this.readBuffer.attachTexture(texture);
            const blob = await this.readBuffer.readAsBlob(0, 0, texture.width, texture.height);
            const url = URL.createObjectURL(blob);

            // 前のURLが存在すれば破棄してメモリ解放
            if (previewState?.url) {
                URL.revokeObjectURL(previewState.url);
            }

            preview.set({
                itemId: item.id,
                update: item.update,
                url,
            });
        });
    }

    /**
     * ファイルアップロード処理
     */
    async handleFile(scene: SceneFactoryData, buffer: Uint8Array): Promise<void> {
        const item = this.game.item.allocateItem({
            attrs: {
                image: {
                    asset: await this.game.asset.uploadBuffer(buffer),
                },
                dragging: this.game.attribute.dragging.create(),
            },
            name: '新しいアイテム',
            children: [],
            transform: DEFAULT_TRANSFORM,
            pool: 'factory',
        });

        scene.itemId = item.id;
        this.pool.items[item.id] = { id: item.id };
    }
}

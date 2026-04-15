import type { GlFramebuffer, GlTexture } from '$lib/components/canvas/glcontext';
import { AABB2 } from '$lib/math/aabb2';
import { Vec2 } from '$lib/math/vec2';
import type { FileData } from '@omujs/omu/api/dashboard';
import { get, writable } from 'svelte/store';
import type { Game } from '../../core/game';
import type { Product } from '../../core/game-state';
import { generateUid } from '../../core/helper';
import { createTransform, DEFAULT_TRANSFORM } from '../../core/transform';
import type { AttributeKey, Attributes } from '../../item/attribute';
import { type Item, type ItemPool, type PoolOptions } from '../../item/item';
import client_background from '../../resources/client_background.png';
import type { SceneHandler } from '../scene';
import factory_bg from './img/factory.png';
import ScreenCreator from './ScreenFactory.svelte';

export type FactorySelection = {
    type: 'pick_product';
    productId?: string;
    back?: FactorySelection;
} | {
    type: 'edit_item';
    itemId: string;
} | {
    type: 'edit_product';
    productId: string;
};

export interface SceneFactoryData {
    type: 'factory';
    selecting?: FactorySelection;
}

export const preview = writable<Record<string, {
    itemId: string;
    update: number;
    url: string;
}>>({});

type AttributeClipboard<K extends AttributeKey = AttributeKey> = {
    type: K;
    data: Attributes[K];
};

export const attributeClipboard = writable<AttributeClipboard | undefined>();

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
    private readonly readBuffer: GlFramebuffer;
    private cachedAssets: SceneAssets | null = null; // アセットのキャッシュ

    constructor(private readonly game: Game) {
        this.readBuffer = game.pipeline.context.createFramebuffer();
    }

    get pool(): ItemPool {
        return this.game.states.factory.value;
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

    public createProductFromItem(item: Item) {
        const { scene, products } = this.game.states;
        if (scene.value.type !== 'factory') return;
        const { selecting } = scene.value;
        if (!selecting) return;
        if (selecting.type !== 'pick_product') return;
        const clone = this.game.item.clone(item);
        if (selecting.productId) {
            const product = products.get(selecting.productId);
            if (!product) return;
            product.itemId = clone.id;
            scene.value = {
                type: 'factory',
                selecting: {
                    type: 'edit_product',
                    productId: product.id,
                },
            };
        } else {
            const product: Product = {
                id: generateUid(),
                itemId: clone.id,
                name: clone.name,
                aliases: [],
            };
            products.set(product.id, product);
            scene.value = {
                type: 'factory',
                selecting: {
                    type: 'edit_product',
                    productId: product.id,
                },
            };
        }
    }

    /**
     * プールオプションの共通生成ロジック
     */
    private getPoolOptions(): PoolOptions {
        const { resolution } = this.game.renderer;
        return {
            pool: this.pool,
            name: '作業台',
            ordering: 'lower',
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

        if (this.game.side === 'client') {
            await this.renderSceneClientSide(scene, assets, options);
        } else if (this.game.side === 'overlay') {
            await this.renderSceneOverlaySide(scene, assets, options);
        } else if (this.game.side === 'background') {
            await this.renderSceneBackgroundSide(scene, assets);
        }
        await this.processInput(options, isClient);
    }

    private async renderSceneClientSide(scene: SceneFactoryData, assets: SceneAssets, options: PoolOptions) {
        const { draw } = this.game.pipeline;
        const { renderer, itemRenderer, trashbin, fridge } = this.game;

        // 1. 背景の描画
        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);
        draw.texture(...renderer.bounds.fit(assets.texFactory.size).toArray(), assets.texFactory);

        // 2. アイテムプールの描画
        itemRenderer.initPass();
        await itemRenderer.renderPool(this.pool, options);

        await trashbin.render(new Vec2(renderer.bounds.max.x - OFFSETS.TRASHBIN_X, renderer.bounds.max.y));
        await fridge.render();

        // 4. 手に持っているアイテムの描画 (共通)
        await itemRenderer.renderHeld();

        const itemId = this.getPreviewItemId(scene);
        // 選択アイテムがない場合はクリア
        if (itemId) {
            await this.updatePreview(itemId);
        }
        for (const product of this.game.states.products.values()) {
            await this.updatePreview(product.itemId);
        }
    }

    private async renderSceneOverlaySide(scene: SceneFactoryData, assets: SceneAssets, options: PoolOptions) {
        const { draw } = this.game.pipeline;
        const { renderer, itemRenderer } = this.game;

        // 1. 背景の描画
        draw.texture(...renderer.bounds.fit(assets.texFactory.size).toArray(), assets.texFactory);

        // 2. アイテムプールの描画
        itemRenderer.initPass();
        await itemRenderer.renderPool(this.pool, options);

        // 4. 手に持っているアイテムの描画 (共通)
        await itemRenderer.renderHeld();
    }

    private async renderSceneBackgroundSide(scene: SceneFactoryData, assets: SceneAssets) {
        const { draw } = this.game.pipeline;
        const { renderer } = this.game;

        // 1. 背景の描画
        draw.texture(...renderer.containBounds.toArray(), assets.texBackground);
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
    private getPreviewItemId(scene: SceneFactoryData): string | undefined {
        if (!scene.selecting) return;
        if (scene.selecting.type === 'edit_item') {
            return scene.selecting.itemId;
        }
        if (scene.selecting.type === 'edit_product') {
            const product = this.game.states.products.get(scene.selecting.productId);
            if (!product) return;
            return product.itemId;
        }
    }

    private async updatePreview(itemId: string) {
        const previewState = get(preview);

        const item = this.game.item.get(itemId);
        if (!item) return;

        // すでに最新のプレビューが生成されている場合はスキップ
        const previewEntry = previewState[item.id];
        if (previewEntry && previewEntry.itemId === itemId && previewEntry.update === item.update) {
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
                URL.revokeObjectURL(previewEntry.url);
            }

            preview.set({
                ...previewState,
                [item.id]: {
                    itemId,
                    update: item.update,
                    url,
                },
            });
        });
    }

    /**
     * ファイルアップロード処理
     */
    async handleFile(scene: SceneFactoryData, data: FileData): Promise<void> {
        const asset = await this.game.asset.uploadBuffer(data.buffer);
        const result = (await this.game.asset.getTexture(asset).promise);
        if (result.type === 'error') {
            this.game.notification.add({
                duration: 5000,
                icon: '⚠️',
                title: '読み込みに失敗しました',
                description: result.error.message,
            });
            console.error(result.error);
            return;
        }
        const transform = createTransform();
        transform.offset = { x: 0, y: 300 };
        const item = this.game.item.allocateItem({
            attrs: {
                image: {
                    asset,
                },
                dragging: this.game.attribute.dragging.create(),
            },
            name: data.file.name.split('.')[0] ?? '新しいアイテム',
            children: [],
            transform,
            tags: [],
            pool: 'factory',
        });

        scene.selecting = {
            type: 'edit_item',
            itemId: item.id,
        };
        this.pool.items[item.id] = { id: item.id };
    }
}

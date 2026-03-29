import type { GlTexture } from '$lib/components/canvas/glcontext';
import { hash } from '$lib/helper';
import type { Identifier } from '@omujs/omu';
import type { Game } from './game';

export type Asset = {
    type: 'asset';
    id: string;
} | {
    type: 'url';
    url: string;
};

export function getAssetKey(asset: Asset): string {
    if (asset.type === 'asset') {
        return `asset:${asset.id}`;
    } else {
        return `url:${asset.url}`;
    }
}

export type LoadingResult<T, E> = ({
    type: 'ready';
    data: T;
    unwrap: T;
} | {
    type: 'error';
    error: E;
    unwrap: T;
}) & {
    promise: Promise<LoadingResult<T, E>>;
};

export type LoadingState<T, E = Error> = {
    type: 'loading';
    promise: Promise<LoadingResult<T, E>>;
} | LoadingResult<T, E>;

export type AssetStatus = LoadingState<Uint8Array>;

export interface AssetTexture {
    texture: GlTexture;
    data: ImageData;
}

export type TextureStatus = LoadingState<AssetTexture>;

class Loader<D, T, E = Error> {
    private readonly cache: Map<string, LoadingState<T, E>> = new Map();

    constructor(
        private readonly key: (data: D) => string,
        private readonly load: (data: D) => Promise<T>,
    ) { }

    public get(data: D): LoadingState<T, E> {
        const key = this.key(data);
        let state = this.cache.get(key);
        if (!state) {
            const { promise, resolve } = Promise.withResolvers<LoadingResult<T, E>>();
            state = {
                type: 'loading',
                promise,
            };
            this.cache.set(key, state);
            this.load(data).then(data => {
                const state: LoadingResult<T, E> = {
                    type: 'ready',
                    data,
                    promise,
                    unwrap: data,
                };
                this.cache.set(key, state);
                resolve(state);
            }).catch(error => {
                const state: LoadingResult<T, E> = {
                    type: 'error',
                    error: error as E,
                    promise,
                    get unwrap(): T {
                        throw error;
                    },
                };
                this.cache.set(key, state);
                resolve(state);
            });
        }
        return state;
    }
}

export class AssetManager {
    private readonly assets = new Loader<Asset, Uint8Array>((data) => getAssetKey(data), async (asset) => {
        if (asset.type === 'asset') {
            const buffer = await this.download(asset.id);
            return buffer;
        } else {
            const response = await fetch(asset.url);
            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        }
    });

    private readonly textures = new Loader<Asset, AssetTexture>((data) => getAssetKey(data), async (asset) => {
        const result = await this.assets.get(asset).promise;
        if (result.type === 'error') {
            throw result.error;
        }
        const { data } = result;
        const texture = await this.createTexture(data);
        return texture;
    });

    private readonly dataCanvas: OffscreenCanvas;
    private readonly dataContext: OffscreenCanvasRenderingContext2D;

    constructor(
        private readonly game: Game,
    ) {
        this.dataCanvas = new OffscreenCanvas(1, 1);
        const ctx = this.dataCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to create canvas context');
        }
        this.dataContext = ctx;
    }

    private getAssetId(id: string): Identifier {
        const { omu } = this.game.app;
        return omu.app.id.join('asset', id);
    }

    private async download(id: string): Promise<Uint8Array> {
        const { omu } = this.game.app;
        const assetId = omu.app.id.join('asset', id);
        return (await omu.assets.download(assetId)).buffer;
    }

    public getTexture(asset: Asset): TextureStatus {
        return this.textures.get(asset);
    }

    public getTextureByUrl(url: string): TextureStatus {
        return this.textures.get({ type: 'url', url });
    }

    private getImageData(image: HTMLImageElement): ImageData {
        this.dataCanvas.width = image.width;
        this.dataCanvas.height = image.height;
        this.dataContext.drawImage(image, 0, 0);
        return this.dataContext.getImageData(0, 0, image.width, image.height);
    }

    private async createTexture(data: Uint8Array): Promise<AssetTexture> {
        const { context } = this.game.pipeline;
        const texture = context.createTexture();
        const image = new Image();
        const blob = new Blob([data as BlobPart]);
        const url = URL.createObjectURL(blob);
        image.src = url;
        await image.decode();
        const imageData = this.getImageData(image);
        URL.revokeObjectURL(url);
        texture.use(() => {
            texture.setImage(image, {
                width: image.width,
                height: image.height,
                format: 'rgba',
                internalFormat: 'rgba',
            });
            texture.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        return {
            texture,
            data: imageData,
        };
    }

    public upload(asset: Asset) {
        this.game.states.assets.set(getAssetKey(asset), asset);
        return asset;
    }

    public async uploadFile(file: File): Promise<Asset> {
        const { omu } = this.game.app;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const id = hash(buffer);
        const asset: Asset = {
            type: 'asset',
            id,
        };
        const assetId = this.getAssetId(id);
        await omu.assets.upload(assetId, buffer);
        return this.upload(asset);
    }
}

import type { GlTexture } from '$lib/components/canvas/glcontext';
import { hash } from '$lib/helper';
import type { Identifier } from '@omujs/omu';
import type { Game } from './game';
import type { ValidateResult } from './helper';

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

export function validateAsset(value: Asset): ValidateResult<Asset> {
    if (typeof value !== 'object' || typeof value.type !== 'string') {
        return { type: 'invalid', message: 'Assetはオブジェクトで、typeプロパティを持つ必要があります' };
    }
    if (value.type === 'asset') {
        if (!value.id) {
            return { type: 'invalid', message: 'アセットIDが指定されていません' };
        }
    } else {
        if (!value.url) {
            return { type: 'invalid', message: 'URLが指定されていません' };
        }
        try {
            new URL(value.url);
        } catch {
            return { type: 'invalid', message: '無効なURLです' };
        }
    }
    return { type: 'valid', value };
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
            if (asset.url.startsWith('https://')) {
                const proxiedUrl = this.game.app.omu.assets.proxy(asset.url);
                const response = await fetch(proxiedUrl);
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);
            } else {
                const response = await fetch(asset.url);
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);
            }
        }
    });

    private readonly blobs = new Loader<Asset, Blob>((data) => getAssetKey(data), async (asset) => {
        const buffer = await this.assets.get(asset).promise;
        if (buffer.type === 'error') {
            throw buffer.error;
        }
        return new Blob([buffer.data as BlobPart]);
    });

    private readonly urls = new Loader<Asset, string>((data) => getAssetKey(data), async (asset) => {
        const blobState = this.blobs.get(asset);
        if (blobState.type === 'error') {
            throw blobState.error;
        }
        const blob = await blobState.promise.then(result => {
            if (result.type === 'error') {
                throw result.error;
            }
            return result.data;
        });
        return URL.createObjectURL(blob);
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

    private readonly audioBuffers = new Loader<Asset, AudioBuffer>((data) => getAssetKey(data), async (asset) => {
        const result = await this.assets.get(asset).promise;
        if (result.type === 'error') {
            throw result.error;
        }
        const { data } = result;
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        const cachedBuffer = await this.game.audio.ctx.decodeAudioData(arrayBuffer);
        return cachedBuffer;
    });

    private readonly dataCanvas: OffscreenCanvas;
    private readonly dataContext: OffscreenCanvasRenderingContext2D;

    constructor(
        private readonly game: Game,
    ) {
        this.dataCanvas = new OffscreenCanvas(1, 1);
        const ctx = this.dataCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            throw new Error('Failed to create canvas context');
        }
        this.dataContext = ctx;
        this.garbageAssetCollection();
    }

    private garbageAssetCollection() {
        const states = this.game.states;
        const allString = states.getAllJsonStringified(states.assets);
        const toRemove = new Set<string>();
        for (const [id, asset] of states.assets.entries()) {
            const included1 = allString.includes(id);
            const included2 = asset.type === 'asset' && allString.includes(asset.id);
            if (included1 || included2) continue;
            toRemove.add(id);
        }
        for (const id of toRemove) {
            const asset = states.assets.get(id);
            if (!asset) continue;
            if (asset.type === 'asset') {
                const id = this.getAssetId(asset.id);
                this.game.app.omu.assets.delete(id);
            }
            states.assets.delete(id);
        }
    }

    private getAssetId(id: string): Identifier {
        const { omu } = this.game.app;
        return omu.app.id.base.join('asset', id);
    }

    private async download(id: string): Promise<Uint8Array> {
        const { omu } = this.game.app;
        const assetId = this.getAssetId(id);
        return (await omu.assets.download(assetId)).buffer;
    }

    public getTexture(asset: Asset): TextureStatus {
        return this.textures.get(asset);
    }

    public getTextureByUrl(url: string): TextureStatus {
        return this.textures.get({ type: 'url', url });
    }

    public getAudioBuffer(asset: Asset): LoadingState<AudioBuffer> {
        return this.audioBuffers.get(asset);
    }

    public getBlob(asset: Asset): LoadingState<Blob> {
        return this.blobs.get(asset);
    }

    public getUrl(asset: Asset): LoadingState<string> {
        return this.urls.get(asset);
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

    public async uploadBuffer(buffer: Uint8Array): Promise<Asset> {
        const { omu } = this.game.app;
        const id = hash(buffer);
        const asset: Asset = {
            type: 'asset',
            id,
        };
        const assetId = this.getAssetId(id);
        await omu.assets.upload(assetId, buffer);
        return this.upload(asset);
    }

    public async uploadFile(file: File): Promise<Asset> {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        return this.uploadBuffer(buffer);
    }
}

import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { RenderPipeline } from '$lib/components/canvas/pipeline';
import type { Omu } from '@omujs/omu';

export type Asset = {
    type: 'asset';
    id: string;
} | {
    type: 'url';
    url: string;
};

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

export type TextureStatus = LoadingState<GlTexture>;

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
    private readonly assets = new Loader<Asset, Uint8Array>((data) => this.getAssetKey(data), async (asset) => {
        if (asset.type === 'asset') {
            const { buffer } = await this.omu.assets.download(asset.id);
            return buffer;
        } else {
            const response = await fetch(asset.url);
            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        }
    });

    private readonly textures = new Loader<Asset, GlTexture>((data) => this.getAssetKey(data), async (asset) => {
        const result = await this.assets.get(asset).promise;
        if (result.type === 'error') {
            throw result.error;
        }
        const { data } = result;
        const texture = await this.createTexture(data);
        return texture;
    });

    constructor(
        private readonly omu: Omu,
        private readonly pipeline: RenderPipeline,
    ) { }

    private getAssetKey(asset: Asset): string {
        if (asset.type === 'asset') {
            return `asset:${asset.id}`;
        } else {
            return `url:${asset.url}`;
        }
    }

    public getTexture(asset: Asset): TextureStatus {
        return this.textures.get(asset);
    }

    public getTextureByUrl(url: string): TextureStatus {
        return this.textures.get({ type: 'url', url });
    }

    private async createTexture(data: Uint8Array): Promise<GlTexture> {
        const { context } = this.pipeline;
        const texture = context.createTexture();
        const image = new Image();
        const blob = new Blob([data as BlobPart]);
        const url = URL.createObjectURL(blob);
        image.src = url;
        await image.decode();
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
        return texture;
    }
}

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

export type AssetStatus = {
    type: 'loading';
} | {
    type: 'ready';
    data: Uint8Array;
} | {
    type: 'error';
    error: Error;
};

export type TextureStatus = {
    type: 'loading';
} | {
    type: 'ready';
    texture: GlTexture;
} | {
    type: 'error';
    error: Error;
};

export class AssetManager {
    private readonly cache: Map<string, AssetStatus> = new Map();
    private readonly textures: Map<string, TextureStatus> = new Map();

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

    public async getAsset(asset: Asset): Promise<AssetStatus> {
        const existing = this.cache.get(this.getAssetKey(asset));
        if (existing) return existing;

        this.cache.set(this.getAssetKey(asset), { type: 'loading' });

        try {
            let data: Uint8Array;
            if (asset.type === 'asset') {
                const { buffer } = await this.omu.assets.download(asset.id);
                data = buffer;
            } else {
                const response = await fetch(asset.url);
                const arrayBuffer = await response.arrayBuffer();
                data = new Uint8Array(arrayBuffer);
            }
            const status: AssetStatus = { type: 'ready', data };
            this.cache.set(this.getAssetKey(asset), status);
            return status;
        } catch (error) {
            const status: AssetStatus = { type: 'error', error: error as Error };
            this.cache.set(this.getAssetKey(asset), status);
            return status;
        }
    }

    public async getTexture(asset: Asset): Promise<TextureStatus> {
        const assetKey = this.getAssetKey(asset);
        const existing = this.textures.get(assetKey);
        if (existing) return existing;

        this.textures.set(assetKey, { type: 'loading' });

        const assetStatus = await this.getAsset(asset);
        if (assetStatus.type === 'loading') {
            return { type: 'loading' };
        }

        if (assetStatus.type === 'error') {
            const status: TextureStatus = { type: 'error', error: assetStatus.error };
            this.textures.set(assetKey, status);
            return status;
        }

        try {
            const texture = await this.createTexture(assetStatus.data);
            const status: TextureStatus = { type: 'ready', texture };
            this.textures.set(assetKey, status);
            return status;
        } catch (error) {
            const status: TextureStatus = { type: 'error', error: error as Error };
            this.textures.set(assetKey, status);
            return status;
        }
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

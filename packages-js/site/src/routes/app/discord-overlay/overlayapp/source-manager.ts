import type { GlTexture } from '$lib/components/canvas/glcontext';
import type { Source } from '../discord-overlay-app';
import type { AppRenderer } from './app-renderer';

type SourceState = {
    type: 'loading';
} | {
    type: 'failed';
} | {
    type: 'loaded';
    texture: GlTexture;
};

const sourceTextures = new Map<string, SourceState>();

export class SourceManager {
    constructor(
        private app: AppRenderer,
    ) {}

    public getSourceKey(source: Source): string {
        if (source.type === 'url') {
            return source.url;
        } else if (source.type === 'asset') {
            return source.asset_id;
        }
        throw new Error('Invalid source');
    }

    public getSourceTexture(source: Source): SourceState {
        const key = this.getSourceKey(source);
        const existing = sourceTextures.get(key);
        if (existing) return existing;
        sourceTextures.set(key, {
            type: 'loading',
        });
        this.app.overlayApp.getSource(source).then((buffer) => {
            const texture = this.app.pipeline.context.createTexture();
            const image = new Image();
            const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'image/png' });
            image.src = URL.createObjectURL(blob);
            image.onerror = () => {
                sourceTextures.set(key, {
                    type: 'failed',
                });
            };
            image.onload = () => {
                texture.use(() => {
                    texture.setImage(image, {
                        width: image.width,
                        height: image.height,
                        internalFormat: 'rgba',
                        format: 'rgba',
                    });
                    texture.setParams({
                        minFilter: 'linear',
                        magFilter: 'linear',
                        wrapS: 'clamp-to-edge',
                        wrapT: 'clamp-to-edge',
                    });
                });
                sourceTextures.set(key, {
                    type: 'loaded',
                    texture,
                });
            };
        });

        return {
            type: 'loading',
        };
    }
}

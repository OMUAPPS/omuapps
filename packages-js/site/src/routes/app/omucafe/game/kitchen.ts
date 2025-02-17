import type { GlTexture } from '$lib/components/canvas/glcontext.js';
import type { Asset } from './asset.js';
import type { ItemState } from './item-state.js';

export type Kitchen = {
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
};

export type KitchenContext = {
    items: Record<string, ItemState>,
    held: string | null,
    hovering: string | null,
    mouse: { x: number, y: number },
    side: 'client' | 'background' | 'overlay',
    renderItem: (item: ItemState, options: { parent?: ItemState }) => Promise<void>,
    getTextureByAsset: (asset: Asset) => Promise<{ tex: GlTexture, width: number, height: number }>,
};

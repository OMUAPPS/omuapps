import type { KitchenItem } from './kitchen-item.js';

export type Kitchen = {
    items: Record<string, KitchenItem>,
    held: string | null,
    hovering: string | null,
};

export type KitchenContext = {
    items: Record<string, KitchenItem>,
    held: string | null,
    hovering: string | null,
    side: 'client' | 'asset',
};

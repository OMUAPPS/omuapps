import { TableType } from '@omujs/omu/api/table';
import { APP_ID } from '../app.js';
import type { Asset } from '../asset/asset.js';
import type { Order } from '../order/order.js';

export type GalleryItem = {
    id: string,
    asset: Asset,
    timestamp: string,
    order: Order | null,
};

export const GALLERY_TABLE_TYPE = TableType.createJson<GalleryItem>(APP_ID, {
    name: 'gallery',
    key: (item) => item.id,
});

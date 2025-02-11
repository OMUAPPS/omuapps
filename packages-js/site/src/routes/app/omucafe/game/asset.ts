import { Identifier } from '@omujs/omu';
import { APP_ID } from '../app.js';
import { getGame } from '../omucafe-app.js';

export type Asset = {
    type: 'url',
    url: string,
} | {
    type: 'asset',
    id: string,
};

export async function uploadAsset(file: File): Promise<Asset> {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const id = APP_ID.join('asset', hash);
    const result = await getGame().omu.assets.upload(id, buffer);
    return {
        type: 'asset',
        id: result.key(),
    }
}

export async function getAssetImage(asset: Asset): Promise<HTMLImageElement> {
    if (asset.type === 'url') {
        const image = new Image();
        image.src = asset.url;
        await image.decode();
        return image;
    }
    if (asset.type === 'asset') {
        const result = await getGame().omu.assets.download(Identifier.fromKey(asset.id));
        const image = new Image();
        image.src = URL.createObjectURL(new Blob([result.buffer]));
        await image.decode();
        URL.revokeObjectURL(image.src);
        return image;
    }
    throw new Error(`Invalid asset type: ${asset}`);
}

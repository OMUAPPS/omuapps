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

export async function getAsset(asset: Asset): Promise<string | URL> {
    if (asset.type === 'url') {
        return asset.url;
    }
    if (asset.type === 'asset') {
        const result = await getGame().omu.assets.download(Identifier.fromKey(asset.id));
        return URL.createObjectURL(new Blob([result.buffer]));
    }
    throw new Error(`Invalid asset type: ${asset}`);
}

const images = new Map<string, Promise<HTMLImageElement>>();
const audios = new Map<string, Promise<HTMLAudioElement>>();

export async function fetchImage(url: string | URL): Promise<HTMLImageElement> {
    const src = url.toString();
    if (!images.has(src)) {
        images.set(src, new Promise((resolve, reject) => {
            const image = new Image();
            image.src = src;
            image.onload = () => resolve(image);
            image.onerror = reject;
        }));
    }
    return await images.get(src)!;
}

export async function fetchAudio(url: string | URL): Promise<HTMLAudioElement> {
    const src = url.toString();
    if (!audios.has(src)) {
        audios.set(src, new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = src;
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = reject;
        }));
    }
    return await audios.get(src)!;
}

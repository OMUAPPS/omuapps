import type { GlTexture } from '$lib/components/canvas/glcontext.js';
import { Identifier } from '@omujs/omu';
import { APP_ID } from '../app.js';
import { getGame } from '../omucafe-app.js';
import { glContext } from './game.js';

export type Asset = {
    type: 'url',
    url: string,
} | {
    type: 'asset',
    id: string,
};

export async function uploadAsset(id: Identifier, buffer: Uint8Array): Promise<Asset> {
    const { omu, resourcesRegistry } = getGame();
    const result = await omu.assets.upload(id, buffer);
    const asset: Asset = {
        type: 'asset',
        id: result.key(),
    };
    resourcesRegistry.modify((value) => {
        value.assets[id.key()] = asset;
        return value;
    });
    return asset;
}

export async function uploadAssetByFile(file: File): Promise<Asset> {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const id = APP_ID.join('asset', hash);
    const { omu, resourcesRegistry } = getGame();
    const result = await omu.assets.upload(id, buffer);
    const asset: Asset = {
        type: 'asset',
        id: result.key(),
    };
    resourcesRegistry.modify((value) => {
        value.assets[result.key()] = asset;
        return value
    })
    return asset;
}

const assetCache = new Map<string, Promise<string>>();

export function getAssetKey(asset: Asset) {
    if (asset.type === 'url') {
        return asset.url;
    } else if (asset.type === 'asset') {
        return asset.id;
    } else {
        throw new Error(`Unknown asset type ${asset}`);
    }
}

export async function getAsset(asset: Asset): Promise<string> {
    if (asset.type === 'url') {
        return asset.url;
    }
    if (asset.type === 'asset') {
        const existing = assetCache.get(asset.id);
        if (existing) {
            return existing;
        }
        const { omu } = getGame();
        const promise = new Promise<string>((resolve, reject) => {
            omu.assets.download(Identifier.fromKey(asset.id)).then((result) => {
                const url = URL.createObjectURL(new Blob([result.buffer]));
                resolve(url);
            }).catch((error) => {
                reject(`Error downloading asset ${asset.id}: ${error}`);
            });
        });
        assetCache.set(asset.id, promise);
        return promise;
    }
    throw new Error(`Invalid asset type: ${asset}`);
}

export async function getAssetBuffer(asset: Asset): Promise<Uint8Array> {
    if (asset.type === 'url') {
        const response = await fetch(asset.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch asset from URL: ${asset.url}`);
        }
        return new Uint8Array(await response.arrayBuffer());
    } else if (asset.type === 'asset') {
        const result = await getGame().omu.assets.download(Identifier.fromKey(asset.id));
        return result.buffer;
    } else {
        throw new Error(`Unknown asset type ${asset}`);
    }
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

export type Texture = {
    tex: GlTexture,
    width: number,
    height: number,
    image: HTMLImageElement,
    pixels: Uint8Array,
};

export const textures: Map<string, Promise<Texture>> = new Map();

async function getTexture(key: string, image: HTMLImageElement): Promise<Texture> {
    const existing = textures.get(key);
    if (existing) {
        return existing;
    }
    const promise = new Promise<Texture>((resolve) => {
        const tex = glContext.createTexture();
        tex.use(() => {
            tex.setImage(image, {
                width: image.width,
                height: image.height,
                internalFormat: 'rgba',
                format: 'rgba',
            });
            tex.setParams({
                minFilter: 'linear',
                magFilter: 'linear',
                wrapS: 'clamp-to-edge',
                wrapT: 'clamp-to-edge',
            });
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2d context');
        }
        context.drawImage(image, 0, 0);
        const pixels = new Uint8Array(image.width * image.height * 4);
        context.getImageData(0, 0, image.width, image.height).data.forEach((value, index) => {
            pixels[index] = value;
        });

        const texture: Texture = {
            tex: tex,
            width: image.width,
            height: image.height,
            image,
            pixels,
        };
        resolve(texture);
    });
    textures.set(key, promise);
    return promise;
}

export async function getTextureByUri(uri: string): Promise<Texture> {
    const existing = textures.get(uri);
    if (existing) {
        return existing;
    }
    const image = new Image();
    image.src = uri;
    await image.decode();
    return getTexture(uri, image);
}

export async function getTextureByAsset(asset: Asset): Promise<Texture> {
    const url = await getAsset(asset);
    const image = await fetchImage(url);
    const texture = await getTexture(url.toString(), image);
    return texture;
}

export async function getAudioByUri(uri: string): Promise<HTMLAudioElement> {
    const existing = audios.get(uri);
    if (existing) {
        return existing;
    }
    const promise = new Promise<HTMLAudioElement>((resolve) => {
        const audio = new Audio(uri);
        audio.addEventListener('canplaythrough', () => {
            resolve(audio);
        });
        audio.addEventListener('error', (event) => {
            console.error('Error loading audio:', event);
            resolve(audio);
        });
        audio.load();
    });
    audios.set(uri, promise);
    return promise;
}

export async function getAudioByAsset(asset: Asset): Promise<HTMLAudioElement> {
    const url = await getAsset(asset);
    const audio = await getAudioByUri(url.toString());
    return audio;
}

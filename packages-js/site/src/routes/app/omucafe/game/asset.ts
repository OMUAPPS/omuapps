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

export type Texture = {
    tex: GlTexture,
    width: number,
    height: number,
    image: HTMLImageElement,
    pixels: Uint8Array,
};

export const textures: Map<string, Texture> = new Map();

async function getTexture(key: string, image: HTMLImageElement): Promise<Texture> {
    const existing = textures.get(key);
    if (existing) {
        return existing;
    }
    const tex = glContext.createTexture();
    tex.use(() => {
        tex.setImage(image, {
            width: image.width,
            height: image.height,
            internalFormat: 'rgba',
            format: 'rgba',
        });
        tex.setParams({
            minFilter: 'nearest',
            magFilter: 'nearest',
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
    textures.set(key, texture);
    return texture;
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
    const key = asset.type === 'url' ? asset.url : asset.id;
    const existing = textures.get(key);
    if (existing) {
        return existing;
    }
    const image = await getAsset(asset).then(fetchImage);
    return getTexture(key, image);
}

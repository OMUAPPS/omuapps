import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { AlignType } from '@omujs/ui';
import { writable, type Writable } from 'svelte/store';
import { APP_ID, REMOTE_APP } from './app.js';

export type ImageResource = {
    type: 'image';
    asset: string;
    filename?: string;
    addedAt?: number;
    size?: number;
};
export type AlbumResource = {
    type: 'album';
    assets: string[];
    filename?: string;
    addedAt?: number;
    size?: number;
    duration: number;
};

export type Resource = ImageResource | AlbumResource;

const DEFAULT_RESOURCES = {
    resources: {} as Record<string, Resource>,
};

type Resources = typeof DEFAULT_RESOURCES;
const RESOURCES_REGISTRY = RegistryType.createJson<Resources>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCES,
});

export type Scaler = {
    type: 'percent';
    value: number;
} | {
    type: 'pixel';
    value: number;
};

export const DEFAULT_CONFIG = {
    show: null as {
        type: 'resource';
        id: string;
    } | null,
    asset: {
        align: {
            x: 'middle' as AlignType,
            y: 'middle' as AlignType,
        },
        scaling: { type: 'contain' } as {
            type: 'contain' | 'cover';
        } | {
            type: 'stretch';
            width: Scaler;
            height: Scaler;
        },
        animation: {
            type: 'none',
        } as {
            type: 'none';
        } | {
            type: 'fade';
            duration: number;
        } | {
            type: 'slide';
            duration: number;
            direction: 'left' | 'right' | 'up' | 'down';
        } | {
            type: 'flip';
            duration: number;
        },
        easing: {
            type: 'linear',
        } as {
            type: 'linear';
        } | {
            type: 'ease';
        } | {
            type: 'bounce';
        } | {
            type: 'elastic';
        },
    },
    resource: {

    },
};

type Config = typeof DEFAULT_CONFIG;
const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export class RemoteApp {
    public readonly resources: Writable<Resources>;
    public readonly config: Writable<Config>;
    public readonly connected: Writable<boolean>;

    constructor(
        private readonly omu: Omu,
        private readonly side: 'app' | 'remote' | 'asset',
    ) {
        this.resources = makeRegistryWritable(omu.registries.get(RESOURCES_REGISTRY));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
        this.connected = writable(false);
        if (side === 'app') {
            omu.sessions.observe(REMOTE_APP, {
                onConnect: () => {
                    this.connected.set(true);
                },
                onDisconnect: () => {
                    this.connected.set(false);
                },
            });
            omu.onReady(async () => {
                this.connected.set(await omu.sessions.has(REMOTE_APP));
            });
        }
    }

    public async upload(...files: File[]) {
        const buffers = await Promise.all(files.map(async (file) => {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const hash = hash(bytes);
            const hashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
            const id = APP_ID.join('resource', hashHex);
            return { identifier: id, buffer: bytes, file };
        }));
        const results = await this.omu.assets.uploadMany(...buffers);
        this.resources.update((resources) => {
            resources.resources = {
                ...resources.resources,
                ...results.reduce((acc, id) => {
                    const entry = buffers.find((buffer) => buffer.identifier.isEqual(id));
                    if (!entry) {
                        return acc;
                    }
                    acc[id.key()] = {
                        type: 'image',
                        asset: id.key(),
                        filename: entry.file.name,
                        size: entry.file.size,
                        addedAt: Date.now(),
                    };
                    return acc;
                }, {} as Resources['resources']),
            };
            return resources;
        });
    }

    public async deleteResource(...keys: string[]) {
        keys.forEach(async (key) => {
            await this.omu.assets.delete(key);
        });
        this.resources.update((resources) => {
            for (const key of keys) {
                delete resources.resources[key];
            }
            return resources;
        });
    }

    public async createAlbum(assets: string[], filename?: string) {
        const now = Date.now();
        const hashBytes = hash(new TextEncoder().encode([now, ...assets].join('')));
        const hash = Array.from(new Uint8Array(hashBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const id = APP_ID.join('album', hash);
        this.resources.update((resources) => {
            resources.resources[id.key()] = {
                type: 'album',
                assets,
                filename,
                addedAt: now,
                duration: 10,
            };
            return resources;
        });
    }

    private readonly cache = new Map<string, Promise<string>>();

    public async assetUri(asset: string) {
        if (this.cache.has(asset)) {
            return await this.cache.get(asset)!;
        }
        const promise = new Promise<string>((resolve, reject) => {
            this.omu.assets.download(asset).then(async ({ buffer }) => {
                const blob = new Blob([buffer as BlobPart]);
                const uri = URL.createObjectURL(blob);
                const resized = await resizeImage(uri, 256, 256);
                resolve(resized);
            }).catch(reject);
        });
        this.cache.set(asset, promise);
        return promise;
    }
}

async function resizeImage(image: string, width: number, height: number): Promise<string> {
    const img = new Image();
    img.src = image;
    await new Promise((resolve) => {
        img.onload = resolve;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const aspect = img.width / img.height;
    const targetAspect = width / height;
    // contain
    let scale = 1;
    if (aspect > targetAspect) {
        scale = width / img.width;
    } else {
        scale = height / img.height;
    }
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
    return canvas.toDataURL();
}

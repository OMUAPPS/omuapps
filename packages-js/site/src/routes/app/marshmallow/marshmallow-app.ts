import { Omu, Serializer } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import { get, type Writable } from 'svelte/store';
import type { Message } from './api.js';
import { APP_ID } from './app.js';

export const PLUGIN_ID = APP_ID.join('plugin');
export type User = {
    name: string;
    screen_name: string;
    image: string;
    premium: boolean;
};

export type Asset = {
    type: 'url';
    url: string;
} | {
    type: 'asset';
    id: string;
};

export type Font = {
    family: string;
    weight: string;
};

export type MarshmallowSkin = {
    id: string;
    version: 1;
    meta: {
        name: string;
        note: string;
    };
    watermark: {
        side: 'top' | 'bottom';
        margin: {
            x: number;
            y: number;
        };
    };
    textures: {
        top: Asset;
        middle: Asset;
        bottom: Asset;
        min_height: number;
    };
    text: {
        font: Font;
        color: string;
    };
    cursor: {
        asset: Asset;
        x: number;
        y: number;
        scale: number;
    };
    transition: {
        in: {
            type: 'default' | 'paper';
        };
    };
};

import { sha256 } from '$lib/helper.js';
import bottom from './skins/bottom.svg';
import cursor from './skins/cursor.png';
import middle from './skins/middle.svg';
import top from './skins/top.svg';
const DEFAULT_SKIN: MarshmallowSkin = {
    id: 'default',
    version: 1,
    meta: {
        name: 'デフォルト',
        note: '説明文',
    },
    watermark: {
        side: 'bottom',
        margin: { x: 0, y: 60 },
    },
    textures: {
        top: { type: 'url', url: top },
        middle: { type: 'url', url: middle },
        bottom: { type: 'url', url: bottom },
        min_height: 120,
    },
    text: {
        font: { family: 'Noto Sans JP', weight: '400' },
        color: '#333',
    },
    cursor: {
        asset: { type: 'url', url: cursor },
        x: 0,
        y: 0,
        scale: 1,
    },
    transition: {
        in: {
            type: 'default',
        },
    },
};

export function createSkin(): MarshmallowSkin {
    const newSkin = JSON.parse(JSON.stringify(DEFAULT_SKIN));
    newSkin.id = Date.now();
    return newSkin;
}

export type MarshmallowConfig = {
    user: string | null;
    scale: number;
    skins: Record<string, MarshmallowSkin>;
    active_skins: Record<string, {
        id: string;
    }>;
};

const MARSHMALLOW_CONFIG_REGISTRY_TYPE = RegistryType.createJson<MarshmallowConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        user: null,
        scale: 1,
        skins: {},
        active_skins: {},
    },
    serializer: Serializer.transform<MarshmallowConfig>((config) => {
        config.scale ??= 0;
        config.skins ??= {};
        config.active_skins ??= {};
        return config;
    }),
});

export type MarshmallowScreen = {
    type: 'messages' | 'answers';
} | {
    type: 'skins';
    state: {
        type: 'list';
    } | {
        type: 'create_or_upload';
    } | {
        type: 'edit';
        skin: MarshmallowSkin;
    } | {
        type: 'premium';
    };
};

const SCREEN_REGISTRY = RegistryType.createJson<MarshmallowScreen>(APP_ID, {
    name: 'screen',
    defaultValue: {
        type: 'messages',
    },
});

const ASSETS_REGISTRY = RegistryType.createJson<Record<string, Asset>>(APP_ID, {
    name: 'assets',
    defaultValue: {},
});

export type MarshmallowData = {
    message: Message | null;
    scroll: number;
    pointer: { x: number; y: number } | null;
};

const MARSHMALLOW_DATA_REGISTRY_TYPE = RegistryType.createJson<MarshmallowData>(APP_ID, {
    name: 'data',
    defaultValue: {
        message: null,
        scroll: 0,
        pointer: null,
    },
});

export class MarshmallowApp {
    private static INSTANCE: MarshmallowApp | undefined = undefined;

    public static getInstance() {
        if (this.INSTANCE === undefined) {
            throw new Error('MarshmallowApp is not initialized');
        }
        return this.INSTANCE;
    }

    public readonly config: Writable<MarshmallowConfig>;
    public readonly data: Writable<MarshmallowData>;
    public readonly screen: Writable<MarshmallowScreen>;
    public readonly assets: Writable<Record<string, Asset>>;
    public readonly assetCache: Record<string, Promise<string>> = {};

    constructor(public readonly omu: Omu) {
        this.config = omu.registries.get(MARSHMALLOW_CONFIG_REGISTRY_TYPE).compatSvelte();
        this.data = omu.registries.get(MARSHMALLOW_DATA_REGISTRY_TYPE).compatSvelte();
        this.screen = omu.registries.get(SCREEN_REGISTRY).compatSvelte();
        this.assets = omu.registries.get(ASSETS_REGISTRY).compatSvelte();
        omu.onReady(() => {
            this.screen.set({ type: 'messages' });
        });
        MarshmallowApp.INSTANCE = this;
    }

    public async getAssetUrl(asset: Asset): Promise<string> {
        const key = JSON.stringify(asset);
        const existing = this.assetCache[key];
        if (existing) return existing;
        if (asset.type === 'url') {
            return asset.url;
        } else if (asset.type === 'asset') {
            return this.assetCache[key] = new Promise<string>((resolve) => {
                this.omu.assets.download(asset.id).then(({ buffer }) => {
                    const blob = new Blob([buffer as Uint8Array<ArrayBuffer>], { type: 'image/svg' });
                    resolve(URL.createObjectURL(blob));
                });
            });
        }
        throw new Error(`Invalid asset type: ${JSON.stringify(asset)}`);
    }

    public async uploadAsset(blob: Blob) {
        const buffer = new Uint8Array(await blob.arrayBuffer());
        const hash = sha256(buffer);
        const hashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const assetId = this.omu.app.id.join(hashHex);
        const id = await this.omu.assets.upload(assetId, buffer);
        const asset: Asset = {
            type: 'asset',
            id: id.key(),
        };
        this.assets.update((assets) => {
            assets[asset.id] = asset;
            return assets;
        });
        return asset;
    }

    public async downloadSkin(skin: MarshmallowSkin) {
        const writer = new ByteWriter();
        const serialized = JSON.stringify(skin);
        const assets: Record<string, Extract<Asset, { type: 'asset' }>> = {};
        for (const [assetKey, asset] of Object.entries(get(this.assets))) {
            if (asset.type === 'url') continue;
            if (!serialized.includes(assetKey)) continue;
            assets[assetKey] = asset;
        }
        writer.writeJSON(skin);
        const assetEntries = Object.entries(assets);
        writer.writeULEB128(assetEntries.length);
        for (const [key, asset] of assetEntries) {
            writer.writeString(key);
            const { buffer } = await this.omu.assets.download(asset.id);
            writer.writeUint8Array(buffer);
        }
        return writer.finish();
    }

    public async loadSkin(blob: Blob) {
        const reader = await ByteReader.fromBlob(blob);
        const skin = reader.readJSON<MarshmallowSkin>();
        const assetLength = reader.readULEB128();
        for (let i = 0; i < assetLength; i ++) {
            const key = reader.readString();
            const buffer = reader.readUint8Array();
            const id = await this.omu.assets.upload(key, buffer);
            this.assets.update((assets) => {
                assets[id.key()] = { type: 'asset', id: id.key() };
                return assets;
            });
        }
        return skin;
    }
}

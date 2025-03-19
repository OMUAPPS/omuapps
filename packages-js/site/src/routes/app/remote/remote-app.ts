import { makeRegistryWritable, md5 } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { AlignType } from '@omujs/ui';
import { writable, type Writable } from 'svelte/store';
import { APP_ID, REMOTE_APP_ID } from './app.js';

export type Resource = {
    type: 'image',
    asset: string,
    filename?: string,
    addedAt?: number,
    size?: number,
}

const DEFAULT_RESOURCES = {
    resources: {} as Record<string, Resource>,
}

type Resources = typeof DEFAULT_RESOURCES;
const RESOURCES_REGISTRY = RegistryType.createJson<Resources>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCES,
});

export type Scaler = {
    type: 'percent',
    value: number,
} | {
    type: 'pixel',
    value: number,
}

export const DEFAULT_CONFIG = {
    show: null as {
        type: 'image',
        asset: string,
    } | null,
    asset: {
        align: {
            x: 'middle' as AlignType,
            y: 'middle' as AlignType,
        },
        scaling: {type: 'contain'} as {
            type: 'contain' | 'cover',
        } | {
            type: 'stretch',
            width: Scaler,
            height: Scaler,
        },
    },
    resource: {
        
    }
}

type Config = typeof DEFAULT_CONFIG;
const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export class RemoteApp {
    public readonly resources: Writable<Resources>;
    public readonly config: Writable<Config>;
    public readonly connected: Writable<boolean>;
    
    constructor(private readonly omu: Omu, side: 'app' | 'remote') {
        this.resources = makeRegistryWritable(omu.registries.get(RESOURCES_REGISTRY));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
        this.connected = writable(false);
        if (side === 'app') {
            omu.server.observeSession(REMOTE_APP_ID, {
                onConnect: () => {
                    this.connected.set(true);
                },
                onDisconnect: () => {
                    this.connected.set(false);
                },
            });
            omu.onReady(async () => {
                this.connected.set(await omu.server.sessions.has(REMOTE_APP_ID.key()));
            });
        }
    }

    public async upload(...files: File[]) {
        const buffers = await Promise.all(files.map(async (file) => {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const hash = md5(bytes);
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

    public async deleteResource(key: string) {
        await this.omu.assets.delete(key);
        this.resources.update((resources) => {
            delete resources.resources[key];
            return resources;
        });
    }
}

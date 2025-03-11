import { makeRegistryWritable, md5 } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

type Resource = {
    type: 'image',
    asset: string,
    filename?: string,
}

const DEFAULT_RESOURCES = {
    resources: {} as Record<string, Resource>,
}

type Resources = typeof DEFAULT_RESOURCES;
const RESOURCES_REGISTRY = RegistryType.createJson<Resources>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCES,
});

const DEFAULT_CONFIG = {
    show: null as {
        type: 'image',
        asset: string,
    } | null,
}

type Config = typeof DEFAULT_CONFIG;
const CONFIG_REGISTRY = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export class RemoteApp {
    public readonly resources: Writable<Resources>;
    public readonly config: Writable<Config>;
    
    constructor(private readonly omu: Omu) {
        this.resources = makeRegistryWritable(omu.registries.get(RESOURCES_REGISTRY));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
    }

    public async upload(file: File) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const hash = md5(bytes);
        const hashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const id = APP_ID.join('resource', hashHex);
        const result = await this.omu.assets.upload(id, bytes);
        this.resources.update((resources) => {
            resources.resources[result.key()] = {
                type: 'image',
                asset: result.key(),
                filename: file.name,
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

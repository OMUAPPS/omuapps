import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

type Resource = {
    type: 'image',
    asset: string,
}

const DEFAULT_RESOURCES = {
    resources: [] as Resource[],
}
type Resources = typeof DEFAULT_RESOURCES;
const RESOURCES_REGISTRY = RegistryType.createJson<Resources>(APP_ID, {
    name: 'resources',
    defaultValue: DEFAULT_RESOURCES,
});

export class RemoteApp {
    public readonly resources: Writable<Resources>;
    
    constructor(private readonly omu: Omu) {
        this.resources = makeRegistryWritable(omu.registries.get(RESOURCES_REGISTRY));
    }
}

import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

type Config = {
    version: number;
};

const REPLAY_CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'replay_config',
    defaultValue: {
        version: 1,
    },
});

export class DiscordOverlayApp {
    public readonly config: Writable<Config>;

    constructor(private readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registries.get(REPLAY_CONFIG_REGISTRY_TYPE));
    }
}

import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import { IDENTIFIER } from './app.js';
import type { Writable } from 'svelte/store';
import { makeRegistryWritable } from '$lib/helper.js';

export type ChatSubtitleConfig = {
    auto_generate: boolean;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<ChatSubtitleConfig>(IDENTIFIER, {
    name: 'config',
    defaultValue: {
        auto_generate: true,
    },
});

export class ChatSubtitleApp {
    public readonly config: Writable<ChatSubtitleConfig>;

    constructor(omu: Omu) {
        this.config = makeRegistryWritable(omu.registry.get(CONFIG_REGISTRY_TYPE));
    }
}

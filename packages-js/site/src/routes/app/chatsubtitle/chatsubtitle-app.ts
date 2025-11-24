import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type ChatSubtitleConfig = {
    auto_generate: boolean;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<ChatSubtitleConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        auto_generate: true,
    },
});

export class ChatSubtitleApp {
    public readonly config: Writable<ChatSubtitleConfig>;

    constructor(omu: Omu) {
        this.config = omu.registries.get(CONFIG_REGISTRY_TYPE).compatSvelte();
    }
}

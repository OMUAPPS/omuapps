import { type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type Config = {
    version: number;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        version: 0,
    },
});

export class ChatOverlayApp {
    public readonly config: Writable<Config>;

    constructor(public readonly omu: Omu) {
        this.config = omu.registries.get(CONFIG_REGISTRY_TYPE).compatSvelte();
    }
}

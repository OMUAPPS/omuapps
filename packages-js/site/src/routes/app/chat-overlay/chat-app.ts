import { type Omu, type SessionParam } from '@omujs/omu';
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
const SESSION_REGISTRY_TYPE = RegistryType.createJson<SessionParam | null>(APP_ID, {
    name: 'session',
    defaultValue: null,
});

export class ChatOverlayApp {
    public readonly config: Writable<Config>;
    public readonly session: Writable<SessionParam | null>;

    constructor(public readonly omu: Omu) {
        this.config = omu.registries.get(CONFIG_REGISTRY_TYPE).compatSvelte();
        this.session = omu.registries.get(SESSION_REGISTRY_TYPE).compatSvelte();
    }
}

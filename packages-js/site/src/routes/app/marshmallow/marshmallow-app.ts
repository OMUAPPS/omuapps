import { makeRegistryWritable } from '$lib/helper.js';
import { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { type Writable } from 'svelte/store';
import type { Message } from './api.js';
import { APP_ID } from './app.js';

export const PLUGIN_ID = APP_ID.join('plugin');
export type User = {
    name: string;
    screen_name: string;
    image: string;
    premium: boolean;
};

export type MarshmallowConfig = {
    user: string | null;
    syncScroll: boolean;
    showPointer: boolean;
};

const MARSHMALLOW_CONFIG_REGISTRY_TYPE = RegistryType.createJson<MarshmallowConfig>(APP_ID, {
    name: 'config',
    defaultValue: {
        user: null,
        syncScroll: true,
        showPointer: true,
    },
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
    private static instance: MarshmallowApp | undefined = undefined;

    public static getInstance() {
        if (this.instance === undefined) {
            throw new Error('MarshmallowApp is not initialized');
        }
        return this.instance;
    }

    public readonly config: Writable<MarshmallowConfig>;
    public readonly data: Writable<MarshmallowData>;

    constructor(public readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registries.get(MARSHMALLOW_CONFIG_REGISTRY_TYPE));
        this.data = makeRegistryWritable(omu.registries.get(MARSHMALLOW_DATA_REGISTRY_TYPE));
        MarshmallowApp.instance = this;
    }
}

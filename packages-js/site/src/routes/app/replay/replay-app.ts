import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { IDENTIFIER } from './app.js';

type ReplayData = {
    videoId: string;
    start: number;
    offset: number;
    playing: boolean;
};

const REPLAY_DATA_REGISTRY_TYPE = RegistryType.createJson<ReplayData | null>(IDENTIFIER, {
    name: 'replay',
    defaultValue: null,
});

type ReplayConfig = {
    active: boolean;
    playbackRate: number;
};

const REPLAY_CONFIG_REGISTRY_TYPE = RegistryType.createJson<ReplayConfig>(IDENTIFIER, {
    name: 'replay_config',
    defaultValue: {
        active: false,
        playbackRate: 1,
    },
});

export class ReplayApp {
    public readonly replayData: Writable<ReplayData | null>;
    public readonly config: Writable<ReplayConfig>;

    constructor(private readonly omu: Omu) {
        this.replayData = makeRegistryWritable(omu.registry.get(REPLAY_DATA_REGISTRY_TYPE));
        this.config = makeRegistryWritable(omu.registry.get(REPLAY_CONFIG_REGISTRY_TYPE));
    }
}

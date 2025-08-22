import { makeRegistryWritable } from '$lib/helper.js';
import { Serializer, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { AlignType } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

type ReplayData = {
    videoId: string;
    start: number;
    offset: number;
    playing: boolean;
};

const REPLAY_DATA_REGISTRY_TYPE = RegistryType.createJson<ReplayData | null>(APP_ID, {
    name: 'replay',
    defaultValue: null,
});

type FilterNoop = {
    type: 'noop';
};

export const DEFAULT_FILTER_NOOP: FilterNoop = { type: 'noop' } as const;

type FilterPixelate = {
    type: 'pixelate';
    radius: number;
};

export const DEFAULT_FILTER_PIXELATE: FilterPixelate = { type: 'pixelate', radius: 50 } as const;

type FilterBlur = {
    type: 'blur';
    radius: number;
};

export const DEFAULT_FILTER_BLUR: FilterBlur = { type: 'blur', radius: 50 } as const;

type Filter = FilterNoop | FilterPixelate | FilterBlur;

const DEFAULT_REPLAY_CONFIG = {
    version: 1,
    playbackRate: 1,
    overlay: {
        active: false,
        align: {
            horizontal: 'start' as AlignType,
            vertical: 'end' as AlignType,
        },
        time: {
            active: true,
            duration: false,
        },
        title: false,
        hideVideo: false,
    },
    filter: { type: 'noop' } as Filter,
}
type ReplayConfig = typeof DEFAULT_REPLAY_CONFIG;

const REPLAY_CONFIG_REGISTRY_TYPE = RegistryType.createJson<ReplayConfig>(APP_ID, {
    name: 'replay_config',
    defaultValue: DEFAULT_REPLAY_CONFIG,
    serializer: Serializer.transform<ReplayConfig>((config) => {
        if (!config.version) {
            config.version = 1;
            config.overlay = DEFAULT_REPLAY_CONFIG.overlay;
            config.filter = DEFAULT_REPLAY_CONFIG.filter;
        }
        return config;
    }),
});

type AppSide = 'client' | 'asset';

export class ReplayApp {
    public readonly replayData: Writable<ReplayData | null>;
    public readonly config: Writable<ReplayConfig>;
    
    private constructor(
        public readonly omu: Omu,
        public readonly side: AppSide,
    ) {
        this.replayData = makeRegistryWritable(omu.registries.get(REPLAY_DATA_REGISTRY_TYPE));
        this.config = makeRegistryWritable(omu.registries.get(REPLAY_CONFIG_REGISTRY_TYPE));
    }

    private static instance: ReplayApp;

    public static create(omu: Omu, side: AppSide) {
        if (this.instance) {
            if (BROWSER) {
                throw new Error('ReplayApp instance already created');
            }
            return this.instance;
        }
        this.instance = new ReplayApp(omu, side);
        return this.instance;
    }
    
    public static getInstance() {
        if (!this.instance) {
            throw new Error('ReplayApp instance not created yet');
        }
        return this.instance;
    }
    
}

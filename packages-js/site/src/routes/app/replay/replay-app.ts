import { makeRegistryWritable } from '$lib/helper.js';
import { type Vec4Like } from '$lib/math/vec4.js';
import { Serializer, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { AlignType } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

export type Video = {
    type: 'youtube';
    id: string;
} | {
    type: 'twitch';
    channel: string;
    video?: string;
};

export type Playback = {
    start: number;
    offset: number;
    playing: boolean;
};

export type VideoInfo = {
    author?: string;
    title?: string;
    duration?: number;
};

type ReplayData = {
    video: Video;
    info: VideoInfo;
    playback: Playback;
};

const REPLAY_DATA_REGISTRY_TYPE = RegistryType.createJson<ReplayData | null>(APP_ID, {
    name: 'replay',
    defaultValue: null,
    serializer: Serializer.transform<ReplayData | null>((data) => {
        if (data && (
            !data.video ||
            !data.info ||
            !data.playback
        )) return null;
        return data;
    }),
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

type FilterColorKey = {
    type: 'color_key';
    color: Vec4Like;
    add: number;
    sub: number;
};

export const DEFAULT_FILTER_COLOR_KEY: FilterColorKey = { type: 'color_key', color: { x: 0, y: 1, z: 0, w: 1 }, sub: 100, add: -20 } as const;

type Filter = FilterNoop | FilterPixelate | FilterBlur | FilterColorKey;

const DEFAULT_REPLAY_CONFIG = {
    version: 2,
    playbackRate: 1,
    muted: true,
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
};
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

    private extractYoutubeVideoId(url: URL): string | undefined {
        const path = url.pathname.split('/');
        if (url.hostname === 'youtu.be') {
            return path[1];
        } else if (url.hostname === 'www.youtube.com') {
            switch (path[1]) {
                case 'watch': {
                    return url.searchParams.get('v') || undefined;
                }
                case 'shorts':
                case 'live': {
                    return path[2];
                }
            }
        }
    }

    public playByUrl(url: URL) {
        const videoId = this.extractYoutubeVideoId(url);
        if (videoId) {
            this.replayData.set({
                video: {
                    type: 'youtube',
                    id: videoId,
                },
                info: {},
                playback: {
                    start: 0,
                    offset: 0,
                    playing: false,
                },
            });
            return;
        }
        if (url.hostname === 'www.twitch.tv' || url.hostname === 'twitch.tv') {
            const [, channel] = url.pathname.split('/');
            this.replayData.set({
                video: {
                    type: 'twitch',
                    channel: channel,
                },
                info: {},
                playback: {
                    start: 0,
                    offset: 0,
                    playing: false,
                },
            });
            return;
        }
    }
}

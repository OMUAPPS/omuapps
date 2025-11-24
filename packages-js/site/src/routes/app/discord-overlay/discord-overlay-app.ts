import { makeRegistryWritable } from '$lib/helper.js';
import { type Vec2Like } from '$lib/math/vec2.js';
import { Identifier, Serializer, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import { BROWSER } from 'esm-env';
import { type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import { DEFAULT_SHADOW_EFFECT_OPTIONS } from './effects/shadow.js';
import { DEFAULT_SPEECH_EFFECT_OPTIONS } from './effects/speech.js';
import { DiscordRPCAPI } from './plugin/plugin.js';

export type Align = 'start' | 'middle' | 'end';
export type Source = {
    type: 'asset';
    asset_id: string;
} | {
    type: 'url';
    url: string;
};
export type UserAvatarConfig = {
    pngtuber: {
        layer: number;
    };
};
export type UserConfig = {
    lastDraggedAt: number;
    position: Vec2Like;
    scale: number;
    avatar: string | null;
    config: UserAvatarConfig;
    align: boolean;
};
export const DEFAULT_USER_CONFIG: UserConfig = {
    lastDraggedAt: 0,
    position: { x: 1920 / 2, y: 1080 / 2 },
    scale: 1,
    avatar: null,
    config: {
        pngtuber: {
            layer: 0,
        },
    },
    align: true,
};
export function createUserConfig(): UserConfig {
    return JSON.parse(JSON.stringify(DEFAULT_USER_CONFIG));
}

export type PngTuberAvatarConfig = {
    type: 'pngtuber';
    key: string;
    source: Source;
    offset: [number, number];
    scale: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
};
export type PngAvatarConfig = {
    type: 'png';
    key: string;
    offset: [number, number];
    scale: number;
    base: Source;
    active?: Source;
    deafened?: Source;
    muted?: Source;
};

export type AvatarConfig = PngTuberAvatarConfig | PngAvatarConfig;

export type GameObject = {
    type: 'image';
};

export type AlignSide = {
    align: Vec2Like;
    side: 'start' | 'middle' | 'end';
};

export type Config = {
    version?: number;
    users: {
        [key: string]: UserConfig;
    };
    avatars: {
        [key: string]: AvatarConfig | undefined;
    };
    effects: {
        speech: typeof DEFAULT_SPEECH_EFFECT_OPTIONS;
        shadow: typeof DEFAULT_SHADOW_EFFECT_OPTIONS;
        backlightEffect: {
            active: boolean;
        };
    };
    user_id: string | null;
    show_name_tags: boolean;
    align: {
        alignSide?: AlignSide;
        margin: number;
    };
};
export const DEFAULT_CONFIG: Config = {
    version: 11,
    users: {},
    avatars: {},
    effects: {
        speech: DEFAULT_SPEECH_EFFECT_OPTIONS,
        shadow: DEFAULT_SHADOW_EFFECT_OPTIONS,
        backlightEffect: {
            active: false,
        },
    },
    user_id: null,
    show_name_tags: true,
    align: {
        alignSide: {
            align: { x: 0, y: 1 },
            side: 'end',
        },
        margin: 100,
    },
};
const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
    serializer: Serializer.transform((config: Config) => {
        if (!config.version || config.version < 10) {
            config = DEFAULT_CONFIG;
        } else if (config.version === 10) {
            config.version = 11;
            config.align = {
                margin: 100,
            };
        }
        return config;
    }),
});

type AppSide = 'client' | 'asset';

export class DiscordOverlayApp {
    private static INSTANCE: DiscordOverlayApp;
    public readonly discord: DiscordRPCAPI;
    public readonly config: Writable<Config>;

    private constructor(
        public readonly omu: Omu,
        private readonly side: AppSide,
    ) {
        this.discord = new DiscordRPCAPI(omu);
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    }

    public static getInstance(): DiscordOverlayApp {
        if (!DiscordOverlayApp.INSTANCE) {
            if (BROWSER) {
                throw new Error('DiscordOverlayApp not initialized');
            }
            return DiscordOverlayApp.INSTANCE;
        }
        return DiscordOverlayApp.INSTANCE;
    }

    public static create(omu: Omu, side: AppSide) {
        if (DiscordOverlayApp.INSTANCE) {
            if (BROWSER) {
                throw new Error('DiscordOverlayApp instance already initialized');
            }
        }
        const overlay = new DiscordOverlayApp(omu, side);
        DiscordOverlayApp.INSTANCE = overlay;
        return overlay;
    }

    public isOnAsset() {
        return this.side === 'asset';
    }

    public isOnClient() {
        return this.side === 'client';
    }

    public async getSource(source: Source): Promise<Uint8Array> {
        const type = source.type;
        if (type === 'asset') {
            const file = await this.omu.assets.download(Identifier.fromKey(source.asset_id));
            return file.buffer;
        } else if (type === 'url') {
            const proxyUrl = this.omu.assets.proxy(source.url);
            const response = await fetch(proxyUrl);
            const buffer = new Uint8Array(await response.arrayBuffer());
            return buffer;
        }
        throw new Error(`Invalid source type: ${type}`);
    }

    public resetConfig(): void {
        this.config.set(DEFAULT_CONFIG);
    }
}

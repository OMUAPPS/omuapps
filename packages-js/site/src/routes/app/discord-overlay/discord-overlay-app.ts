import { type Vec2Like } from '$lib/math/vec2.js';
import { Identifier, Serializer, type Omu } from '@omujs/omu';
import { BROWSER } from 'esm-env';
import { type Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import { DEFAULT_SHADOW_EFFECT_OPTIONS } from './effects/shadow.js';
import { DEFAULT_SPEECH_EFFECT_OPTIONS } from './effects/speech.js';
import type { AttachedObject } from './overlayapp/avatar.js';
import type { GameObject } from './overlayapp/object.js';
import { DiscordRPCAPI } from './plugin/plugin.js';

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
        spacing: number;
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
        spacing: 300,
    },
};

type AppSide = 'client' | 'asset';

export interface World {
    objects: Record<string, GameObject>;
    attahed: Record<string, AttachedObject[]>;
}

export class DiscordOverlayApp {
    private static INSTANCE: DiscordOverlayApp;
    public readonly discord: DiscordRPCAPI;
    public readonly config: Writable<Config>;
    public readonly world: Writable<World>;

    private constructor(
        public readonly omu: Omu,
        private readonly side: AppSide,
    ) {
        this.discord = new DiscordRPCAPI(omu);
        this.config = omu.registries.json<Config>('config', {
            default: DEFAULT_CONFIG,
            serializer: Serializer.transform((config: Config): Config => {
                if (!config.version || config.version < 10) {
                    config = DEFAULT_CONFIG;
                } else if (config.version === 10) {
                    config.version = 11;
                    config.align = {
                        margin: 100,
                        spacing: 300,
                    };
                }
                return config;
            }),
        }).compatSvelte();
        this.world = omu.registries.json<World>('world', {
            default: {
                objects: {},
                attahed: {},
            },
        }).compatSvelte();
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
            const response = await this.omu.http.fetch(source.url);
            const buffer = new Uint8Array(await response.arrayBuffer());
            return buffer;
        }
        throw new Error(`Invalid source type: ${type}`);
    }

    public async uploadSource(buffer: ArrayBuffer): Promise<Source> {
        const hash = await crypto.subtle.digest('SHA-256', buffer).then((buf) => {
            return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        });
        const id = APP_ID.join('source', hash);
        await this.omu.assets.upload(id, new Uint8Array(buffer));
        return {
            type: 'asset',
            asset_id: id.key(),
        };
    }

    public resetConfig(): void {
        this.config.set(DEFAULT_CONFIG);
    }
}

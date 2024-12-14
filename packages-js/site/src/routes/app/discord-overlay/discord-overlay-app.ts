import { makeRegistryWritable } from '$lib/helper.js';
import { version } from '$lib/version.json';
import { Identifier, type Omu } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/extension/endpoint/endpoint.js';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

const PLUGIN_ID = Identifier.fromKey('com.omuapps:plugin-discordrpc');
const DISCORDRPC_VC_READ_PERMISSION_ID = PLUGIN_ID.join('vc', 'read');
const DISCORDRPC_VC_SET_PERMISSION_ID = PLUGIN_ID.join('vc', 'set');
const DISCORDRPC_CHANNELS_READ_PERMISSION_ID = PLUGIN_ID.join('channels', 'read');

export const DISCORDRPC_PERMISSIONS = {
    DISCORDRPC_VC_READ_PERMISSION_ID,
    DISCORDRPC_VC_SET_PERMISSION_ID,
    DISCORDRPC_CHANNELS_READ_PERMISSION_ID,
};

type Pan = {
    left: number;
    right: number;
};

type VoiceState = {
    mute: boolean;
    deaf: boolean;
    self_mute: boolean;
    self_deaf: boolean;
    suppress: boolean;
};

export type VoiceStateUser = {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    avatar_decoration_data: null;
    flags: number;
    global_name: string;
    bot: boolean;
    premium_type: number;
};

export type VoiceStateItem = {
    nick: string;
    mute: boolean;
    volume: number;
    pan: Pan;
    voice_state: VoiceState;
    user: VoiceStateUser;
};

const VOICE_STATE_REGISTRY_TYPE = RegistryType.createJson<Record<string, VoiceStateItem>>(PLUGIN_ID, {
    name: 'voice_states',
    defaultValue: {},
});

type SpeakState = {
    speaking: boolean;
    speaking_start: number;
    speaking_stop: number;
}

const SPEAKING_STATE_REGISTRY_TYPE = RegistryType.createJson<Record<string, SpeakState>>(PLUGIN_ID, {
    name: 'speaking_states',
    defaultValue: {},
});

export type SelectedVoiceChannel = {
    guild: {
        id: string;
        name: string;
        icon_url: string | null;
        members: [];
        vanity_url_code: string | null;
    } | null;
    channel: {
        id: string;
        name: string;
        type: number;
        topic: string;
        bitrate: number;
        user_limit: number;
        guild_id: string;
        position: number;
        messages: [];
        voice_states: [];
    };
}

const SELECTED_VOICE_CHANNEL_REGISTRY_TYPE = RegistryType.createJson<SelectedVoiceChannel | null>(PLUGIN_ID, {
    name: 'selected_voice_channel',
    defaultValue: null,
});

export type AuthenticateUser = {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    avatar_decoration_data: null;
    flags: number;
    global_name: string;
    public_flags: number;
    banner: null;
    accent_color: number;
    banner_color: string;
    clan: null;
}
const GET_CLIENTS_ENDPOINT_TYPE = EndpointType.createJson<null, Record<string, AuthenticateUser>>(PLUGIN_ID, {
    name: 'get_clients',
});
export type Guild = {
    id: string;
    name: string;
    icon_url?: string;
}
type GetGuildsResponseData = {
    guilds: Guild[];
}
const GET_GUILDS_ENDPOINT_TYPE = EndpointType.createJson<{ user_id: string }, GetGuildsResponseData>(PLUGIN_ID, {
    name: 'get_guilds',
});
export type Channel = {
    id: string;
    name: string;
    type: number;
}
type GetChannelsResponseData = {
    channels: Channel[];
}
const GET_CHANNELS_ENDPOINT_TYPE = EndpointType.createJson<{ user_id: string, guild_id: string }, GetChannelsResponseData>(PLUGIN_ID, {
    name: 'get_channels',
});
const SET_VC_ENDPOINT_TYPE = EndpointType.createJson<{ user_id: string, guild_id: string | null, channel_id: string | null }, null>(PLUGIN_ID, {
    name: 'set_vc',
});
const WAIT_FOR_READY_ENDPOINT_TYPE = EndpointType.createJson<null, null>(PLUGIN_ID, {
    name: 'wait_for_ready',
});
const REFRESH_ENDPOINT_TYPE = EndpointType.createJson<null, null>(PLUGIN_ID, {
    name: 'refresh',
});

export type Align = 'start' | 'middle' | 'end';
export type Source = {
    type: 'asset';
    asset_id: string;
} | {
    type: 'url';
    url: string;
};
export type UserConfig = {
    show: boolean;
    position: [number, number];
    scale: number;
    avatar: string | null;
};
export const DEFAULT_USER_CONFIG: UserConfig = {
    show: true,
    position: [0, 0],
    scale: 1,
    avatar: null,
};

export type Config = {
    version?: number;
    users: {
        [key: string]: UserConfig;
    },
    avatars: {
        [key: string]: {
            type: 'pngtuber';
            source: Source;
            offset: [number, number];
            scale: number;
            flipHorizontal: boolean;
            flipVertical: boolean;
        } | {
            type: 'png';
            base: Source;
            active?: Source;
            deafened?: Source;
            muted?: Source;
        };
    }
    effects: {
        shadow: {
            active: boolean,
            color: {
                r: number,
                g: number,
                b: number,
                a: number,
            }
        };
        backlightEffect: {
            active: boolean,
        };
        bloom: {
            active: boolean,
        };
    },
    user_id: string | null;
    guild_id: string | null;
    channel_id: string | null;
    zoom_level: number;
    camera_position: [number, number];
    align: {
        horizontal: Align;
        vertical: Align;
        auto: boolean;
        flip: boolean;
        padding: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
        spacing: number;
        scaling: boolean;
    };
};
const DEFAULT_CONFIG: Config = {
    version: 4,
    users: {},
    avatars: {},
    effects: {
        shadow: {
            active: true,
            color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0.25,
            }
        },
        backlightEffect: {
            active: false,
        },
        bloom: {
            active: false,
        },
    },
    user_id: null,
    guild_id: null,
    channel_id: null,
    zoom_level: 1,
    camera_position: [0, 0],
    align: {
        auto: true,
        horizontal: 'end',
        vertical: 'end',
        flip: true,
        padding: {
            left: 150,
            top: 150,
            right: 150,
            bottom: 150,
        },
        spacing: 250,
        scaling: true,
    }
};
const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: DEFAULT_CONFIG,
});

export class DiscordOverlayApp {
    public readonly voiceState: Writable<Record<string, VoiceStateItem>>;
    public readonly speakingState: Writable<Record<string, SpeakState>>;
    public readonly selectedVoiceChannel: Writable<SelectedVoiceChannel | null>;
    public readonly config: Writable<Config>;

    constructor(public readonly omu: Omu) {
        omu.plugins.require({
            omuplugin_discordrpc: `>=${version}`,
        })
        this.voiceState = makeRegistryWritable(omu.registries.get(VOICE_STATE_REGISTRY_TYPE));
        this.speakingState = makeRegistryWritable(omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE));
        this.selectedVoiceChannel = makeRegistryWritable(omu.registries.get(SELECTED_VOICE_CHANNEL_REGISTRY_TYPE));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    }

    public resetConfig(): void {
        this.config.set(DEFAULT_CONFIG);
    }

    public migrateConfig(config: Config): Config {
        if (!config.version) {
            config = DEFAULT_CONFIG;
        }
        if (config.version === 1) {
            config = {
                ...config,
                version: 2,
            };
        }
        if (config.version === 2) {
            config = {
                ...config,
                version: 3,
                effects: DEFAULT_CONFIG.effects,
            };
        }
        if (config.version === 3) {
            config = {
                ...config,
                version: 4,
                align: DEFAULT_CONFIG.align,
            };
        }
        return config;
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

    public async getGuilds(user_id: string): Promise<GetGuildsResponseData> {
        return await this.omu.endpoints.call(GET_GUILDS_ENDPOINT_TYPE, { user_id });
    }

    public async getChannels(user_id: string, guild_id: string): Promise<GetChannelsResponseData> {
        return await this.omu.endpoints.call(GET_CHANNELS_ENDPOINT_TYPE, { user_id, guild_id });
    }

    public async setVC(args: {
        user_id: string, guild_id: string | null, channel_id: string | null
    }): Promise<void> {
        await this.omu.endpoints.call(SET_VC_ENDPOINT_TYPE, args);
    }

    public async getClients(): Promise<Record<string, AuthenticateUser>> {
        return await this.omu.endpoints.call(GET_CLIENTS_ENDPOINT_TYPE, null);
    }

    public async waitForReady(): Promise<void> {
        await this.omu.endpoints.call(WAIT_FOR_READY_ENDPOINT_TYPE, null);
    }

    public async refresh(): Promise<void> {
        await this.omu.endpoints.call(REFRESH_ENDPOINT_TYPE, null);
    }
}

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
const GET_GUILDS_ENDPOINT_TYPE = EndpointType.createJson<{user_id: string}, GetGuildsResponseData>(PLUGIN_ID, {
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
const GET_CHANNELS_ENDPOINT_TYPE = EndpointType.createJson<{user_id: string, guild_id: string}, GetChannelsResponseData>(PLUGIN_ID, {
    name: 'get_channels',
});
const SET_VC_ENDPOINT_TYPE = EndpointType.createJson<{user_id: string, channel_id: string}, null>(PLUGIN_ID, {
    name: 'set_vc',
});
const WAIT_FOR_READY_ENDPOINT_TYPE = EndpointType.createJson<null, null>(PLUGIN_ID, {
    name: 'wait_for_ready',
});
const REFRESH_ENDPOINT_TYPE = EndpointType.createJson<null, null>(PLUGIN_ID, {
    name: 'refresh',
});

export type UserConfig = {
    show: boolean;
    position: [number, number];
    scale: number;
    avatar: string | null;
};

export type Config = {
    users: {
        [key: string]: UserConfig;
    },
    user_id: string | null;
    guild_id: string | null;
    channel_id: string | null;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        users: {},
        user_id: null,
        guild_id: null,
        channel_id: null,
    },
});

export class DiscordOverlayApp {
    public readonly voiceState: Writable<Record<string, VoiceStateItem>>;
    public readonly speakingState: Writable<Record<string, SpeakState>>;
    public readonly config: Writable<Config>;

    constructor(public readonly omu: Omu) {
        omu.plugins.require({
            omuplugin_discordrpc: `>=${version}`,
        })
        this.voiceState = makeRegistryWritable(omu.registries.get(VOICE_STATE_REGISTRY_TYPE));
        this.speakingState = makeRegistryWritable(omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    }

    public async getGuilds(user_id: string): Promise<GetGuildsResponseData> {
        return await this.omu.endpoints.call(GET_GUILDS_ENDPOINT_TYPE, { user_id });
    }

    public async getChannels(user_id: string, guild_id: string): Promise<GetChannelsResponseData> {
        return await this.omu.endpoints.call(GET_CHANNELS_ENDPOINT_TYPE, { user_id, guild_id });
    }

    public async setVC(user_id: string, channel_id: string): Promise<void> {
        await this.omu.endpoints.call(SET_VC_ENDPOINT_TYPE, { user_id, channel_id });
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

import { makeRegistryWritable } from '$lib/helper.js';
import { Identifier, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';

const PLUGIN_ID = Identifier.fromKey('com.omuapps:plugin-discordrpc');
const DISCORDRPC_VC_READ_PERMISSION_ID = PLUGIN_ID.join('vc', 'read');
const DISCORDRPC_VC_SET_PERMISSION_ID = PLUGIN_ID.join('vc', 'set');
const DISCORDRPC_GUILD_READ_PERMISSION_ID = PLUGIN_ID.join('guild', 'read');
const DISCORDRPC_CHANNEL_READ_PERMISSION_ID = PLUGIN_ID.join('channel', 'read');

export const DISCORDRPC_PERMISSIONS = {
    DISCORDRPC_VC_READ_PERMISSION_ID,
    DISCORDRPC_VC_SET_PERMISSION_ID,
    DISCORDRPC_GUILD_READ_PERMISSION_ID,
    DISCORDRPC_CHANNEL_READ_PERMISSION_ID,
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

type VoiceStateUser = {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
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
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        users: {},
    },
});

export class DiscordOverlayApp {
    public readonly voiceState: Writable<Record<string, VoiceStateItem>>;
    public readonly speakingState: Writable<Record<string, SpeakState>>;
    public readonly config: Writable<Config>;

    constructor(omu: Omu) {
        this.voiceState = makeRegistryWritable(omu.registries.get(VOICE_STATE_REGISTRY_TYPE));
        this.speakingState = makeRegistryWritable(omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE));
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
    }
}

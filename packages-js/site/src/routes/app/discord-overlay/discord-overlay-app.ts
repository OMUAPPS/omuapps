import { makeRegistryWritable } from '$lib/helper.js';
import { Identifier, type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/extension/registry/registry.js';
import type { Writable } from 'svelte/store';

const PLUGIN_ID = Identifier.fromKey('com.omuapps:plugin-discordrpc');
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
    bot: boolean;
    premium_type: number;
};
type VoiceStateItem = {
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

export class DiscordOverlayApp {
    public readonly voiceState: Writable<Record<string, VoiceStateItem>>;
    public readonly speakingState: Writable<Record<string, SpeakState>>;

    constructor(omu: Omu) {
        omu.permissions.require(PLUGIN_ID.join('vc', 'read'));
        this.voiceState = makeRegistryWritable(omu.registries.get(VOICE_STATE_REGISTRY_TYPE));
        this.speakingState = makeRegistryWritable(omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE));
    }
}

import { makeRegistryWritable } from '$lib/helper';
import { OmuPermissions, type IntoId, type Omu } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';
import { PermissionType } from '@omujs/omu/api/permission';
import { RegistryType, type Registry } from '@omujs/omu/api/registry';
import { SignalType, type Signal } from '@omujs/omu/api/signal';
import type { Writable } from 'svelte/store';
import { DISCORD_PLUGIN_APP } from '../app';
import { DiscordClientManager, type RPCMessage, type RPCSession, type RPCSpeakingStates, type RPCVoiceStates, type TokenRegistry } from '../discord/discord';

const TOKEN_REGISTRY_TYPE = RegistryType.createJson<TokenRegistry>(DISCORD_PLUGIN_APP, {
    name: 'tokens',
    defaultValue: {
        ports: {},
    },
});

export const VOICE_CHAT_PERMISSION_ID: IntoId = DISCORD_PLUGIN_APP.join('voice_chat');

const SESSION_REGISTRY_TYPE = RegistryType.createJson<Record<number, RPCSession>>(DISCORD_PLUGIN_APP, {
    name: 'sessions',
    defaultValue: [],
    permissions: { read: VOICE_CHAT_PERMISSION_ID },
});

const VOICE_STATES_REGISTRY_TYPE = RegistryType.createJson<Record<number, RPCVoiceStates>>(DISCORD_PLUGIN_APP, {
    name: 'voice_states',
    defaultValue: { },
    permissions: { read: VOICE_CHAT_PERMISSION_ID },
});

const SPEAKING_STATES_REGISTRY_TYPE = RegistryType.createJson<Record<number, RPCSpeakingStates>>(DISCORD_PLUGIN_APP, {
    name: 'speaking_states',
    defaultValue: { },
    permissions: { read: VOICE_CHAT_PERMISSION_ID },
});

const REFRESH = EndpointType.createJson<{ port?: number }, { sessions: RPCSession[] }>(DISCORD_PLUGIN_APP, {
    name: 'refresh',
    permissionId: VOICE_CHAT_PERMISSION_ID,
});

const CHANNEL_MESSAGE = SignalType.createJson<RPCMessage>(DISCORD_PLUGIN_APP, {
    name: 'channel_message',
    permissions: { listen: VOICE_CHAT_PERMISSION_ID },
});

export class DiscordRPCService {
    public readonly discord: DiscordClientManager;
    public readonly tokens: Registry<TokenRegistry>;
    public readonly sessions: Registry<Record<number, RPCSession>>;
    public readonly voiceStates: Registry<Record<number, RPCVoiceStates>>;
    public readonly speakingStates: Registry<Record<number, RPCSpeakingStates>>;
    public readonly channelMessageSignal: Signal<RPCMessage>;

    constructor(
        private readonly omu: Omu,
    ) {
        omu.permissions.register(PermissionType.create(VOICE_CHAT_PERMISSION_ID, {
            metadata: {
                level: 'medium',
                name: {
                    'ja-JP': 'Discordのボイスチャットを取得',
                },
                note: {
                    'ja-JP': '参加しているボイスチャットの状態とそのチャンネルのメッセージを取得します',
                },
            },
        }));
        this.tokens = omu.registries.get(TOKEN_REGISTRY_TYPE);
        this.discord = new DiscordClientManager(this.omu, this.tokens);
        this.sessions = omu.registries.get(SESSION_REGISTRY_TYPE);
        this.voiceStates = omu.registries.get(VOICE_STATES_REGISTRY_TYPE);
        this.speakingStates = omu.registries.get(SPEAKING_STATES_REGISTRY_TYPE);
        this.channelMessageSignal = omu.signals.get(CHANNEL_MESSAGE);
        omu.endpoints.bind(REFRESH, async ({ port }) => {
            await this.refresh();
            const sessions = this.discord.clients.map((client) => client.intoInfo());
            return {
                sessions,
            };
        });
        omu.onReady(async () => {
        });
    }

    private async refresh() {
        await this.discord.refresh();
        const sessions = this.discord.clients.map((client) => client.intoInfo());
        const mapObj = <T, R>(arr: T[], map: (item: T) => [keyof never, R]) => {
            return Object.fromEntries(arr.map(map));
        };
        await this.sessions.set(mapObj(sessions, session => [session.port, session]));
        await this.voiceStates.set(mapObj(sessions, session => [session.port, { states: {} }]));
        await this.speakingStates.set(mapObj(sessions, session => [session.port, { states: {} }]));
        this.discord.clients.forEach((client) => client.start({
            session: (session) => this.sessions.modify((value) => {
                value[client.port] = session;
                return value;
            }),
            voiceState: (states) => this.voiceStates.modify((value) => {
                value[client.port] = states;
                return value;
            }),
            speakingState: (states) => this.speakingStates.modify((value) => {
                value[client.port] = states;
                return value;
            }),
            message: (message) => {
                this.channelMessageSignal.notify({
                    port: client.port,
                    message,
                });
            },
        }));
    }

    public static createPlugin(omu: Omu) {
        omu.permissions.require(
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
        );
        return new DiscordRPCService(omu);
    }
}

export class DiscordRPCAPI {
    public readonly sessions: Writable<Record<string, RPCSession>>;
    public readonly voiceStates: Writable<Record<string, RPCVoiceStates>>;
    public readonly speakingStates: Writable<Record<string, RPCSpeakingStates>>;
    public readonly channelMessageSignal: Signal<RPCMessage>;

    constructor(
        private readonly omu: Omu,
    ) {
        this.sessions = makeRegistryWritable(omu.registries.get(SESSION_REGISTRY_TYPE));
        this.voiceStates = makeRegistryWritable(omu.registries.get(VOICE_STATES_REGISTRY_TYPE));
        this.speakingStates = makeRegistryWritable(omu.registries.get(SPEAKING_STATES_REGISTRY_TYPE));
        this.channelMessageSignal = omu.signals.get(CHANNEL_MESSAGE);
    }

    public async refresh() {
        await this.omu.endpoints.call(REFRESH, {});
    }
}

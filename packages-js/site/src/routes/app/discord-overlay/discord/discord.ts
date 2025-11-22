import { tryCatch, type Result } from '$lib/result';
import type { Omu } from '@omujs/omu';
import type { OmuWS, WSMsg } from '@omujs/omu/api/http';
import type { Registry } from '@omujs/omu/api/registry';
import type { CommandPayloads, DispatchPayloads, Payloads, VoiceStateCreatePayload, WithArg } from './payload';
import type { Channel, Guild, Message, User } from './type';

const DISCORD_CLIENT_ID = '207646673902501888';
const PORT_MIN = 6463;
const PORT_MAX = 6473;
const BASE_HEADERS = {
    'accept': '*/*',
    'accept-language': 'ja',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://streamkit.discord.com',
    'pragma': 'no-cache',
    'referer': 'https://streamkit.discord.com/overlay',
    'user-agent': 'OMUAPPS Discord StreamKit/1.0.0',
};

class DiscordRPC {
    constructor(
        private readonly socket: OmuWS,
        private readonly cmdHandlers: { [K in Payloads['cmd']]?: ((payload: Extract<Payloads, { cmd: K }>) => void)[] } = {},
        private readonly evtHandlers: { [K in DispatchPayloads['evt']]?: ((payload: Extract<DispatchPayloads, { evt: K }>) => void)[] } = {},
        private readonly closeHandlers: ((close: Extract<WSMsg, { type: 'close' }>) => void)[] = [],
        public running: boolean = true,
    ) {
        this.receiveLoop();
        this.onCmd('DISPATCH', (payload) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handlers = this.evtHandlers[payload.evt] as any;
            if (!handlers) {
                throw Error(`No handler found for ${payload.cmd}: ${JSON.stringify(payload)}`);
            }
            const data = payload.data as never;
            handlers.forEach((handler: (payload: Payloads) => void) => handler(data));
        });
        this.onCmd('SUBSCRIBE', () => {});
        this.onCmd('UNSUBSCRIBE', () => {});
    }

    private onCmd<K extends PayloadMap['cmd'], PayloadMap extends Payloads = Payloads>(cmd: K, handler: (payload: Extract<Payloads, { cmd: K }>) => void): () => void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlers = this.cmdHandlers[cmd] ??= [] as any[];
        handlers.push(handler);
        return () => {
            const index = handlers.indexOf(handler);
            if (index == -1) return;
            handlers.splice(index, 1);
        };
    }

    public onEvt<
        K extends DispatchPayloads['evt'],
        Payload extends Extract<DispatchPayloads, { evt: K }>,
    >(
        evt: K,
        handler: (payload: Payload['data']) => void,
        args?: Payload extends WithArg<infer Args> ? Args : undefined,
    ): () => void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlers = this.evtHandlers[evt] ??= [] as any[];
        handlers.push(handler);
        const nonce = this.nonce();
        this.socket.send(JSON.stringify({
            cmd: 'SUBSCRIBE',
            evt,
            args,
            nonce,
        }));
        return () => {
            const index = handlers.indexOf(handler);
            if (index == -1) return;
            handlers.splice(index, 1);
            this.socket.send(JSON.stringify({
                cmd: 'UNSUBSCRIBE',
                evt,
                args,
                nonce,
            }));
        };
    }

    public onClosed(handler: (close: Extract<WSMsg, { type: 'close' }>) => void): () => void {
        this.closeHandlers.push(handler);
        return () => {
            const index = this.closeHandlers.indexOf(handler);
            if (index == -1) return;
            this.closeHandlers.splice(index, 1);
        };
    }

    private nonce(): string {
        const part1 = Array.from({ length: 8 }, () =>
            Math.floor(Math.random() * 16).toString(16),
        ).join('');

        const part2 = Array.from({ length: 4 }, () =>
            Math.floor(Math.random() * 16).toString(16),
        ).join('');

        const part3 = (0x4 << 12 | Math.floor(Math.random() * 0x1000)).toString(16) // Version 4
            .padStart(4, '0');

        const part4 = (0x8 << 12 | Math.floor(Math.random() * 0x1000)).toString(16) // Variant 10xx
            .padStart(4, '0');

        const part5 = Array.from({ length: 12 }, () =>
            Math.floor(Math.random() * 16).toString(16),
        ).join('');

        return `${part1}-${part2}-${part3}-${part4}-${part5}`;
    }

    public dispatch<
        K extends CommandPayloads['cmd'],
        Payload extends Extract<CommandPayloads, { cmd: K }> = Extract<CommandPayloads, { cmd: K }>,
        Args extends Payload['args'] = Payload['args'],
        Data extends Payload['data'] = Payload['data'],
    >(cmd: K, args: Args): { wait: () => Promise<Data> } {
        const nonce = this.nonce();
        this.socket.send(JSON.stringify({
            cmd,
            args,
            nonce,
        }));
        return {
            wait: () => new Promise<Data>((resolve) => {
                const unlistenCmd = this.onCmd(cmd, (received) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rec = received as any;
                    if (rec.nonce !== nonce) return;
                    resolve(rec.data);
                    unlistenCmd();
                });
            }),
        };
    }

    private receiveLoop() {
        const dispatch = async () => {
            while (this.running) {
                const msg = await this.socket.receive();
                if (msg.type === 'close') {
                    this.closeHandlers.forEach((handler) => {
                        handler(msg);
                    });
                    break;
                } else if (msg.type === 'error') {
                    throw new Error(`Error received while Discord RPC receiving: ${msg.type}`);
                } else if (msg.type !== 'text') {
                    throw new Error(`Excepted text but got ${msg.type}: ${msg.data}`);
                }
                const payload: Payloads = JSON.parse(msg.data);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const handlers = this.cmdHandlers[payload.cmd] as any;
                if (!handlers) {
                    throw Error(`No handler found for ${payload.cmd}: ${JSON.stringify(payload)}`);
                }
                handlers.forEach((handler: (payload: Payloads) => void) => handler(payload));
            }
        };
        dispatch();
        return new Promise<void>((resolve, reject) => {
            const error = this.onEvt('ERROR', (data) => {
                reject(data);
                error();
            });
        });
    }

    public stop() {
        this.running = false;
        this.socket.close();
    }
}

class DiscordRPCClient {
    private constructor(
        public readonly port: number,
        public readonly token: string,
        public readonly user: User,
        private readonly rpc: DiscordRPC,
    ) {}

    private static async authorize(rpc: DiscordRPC, fetch: (input: string, init?: RequestInit) => Promise<Response>) {
        const authorizeResp = await rpc.dispatch('AUTHORIZE', {
            client_id: DISCORD_CLIENT_ID,
            scopes: ['rpc', 'messages.read'],
            prompt: 'none',
        }).wait();
        const token_res = await fetch(
            'https://streamkit.discord.com/overlay/token',
            {
                body: JSON.stringify({
                    'code': authorizeResp.code,
                }),
                headers: BASE_HEADERS,
                method: 'POST',
            },
        );
        const token_data: {
            access_token: string;
        } = await token_res.json();
        if ('error' in token_data) {
            throw new Error(`Failed to fetch access token: ${token_data}`);
        }
        if (!('access_token' in token_data)) {
            throw new Error(`Failed to fetch access token: ${token_data}`);
        }
        return token_data['access_token'];
    }

    public async start(callbacks: {
        session: (session: RPCSession) => void;
        voiceState: (message: RPCVoiceStates) => void;
        speakingState: (message: RPCSpeakingStates) => void;
        message: (message: Message) => void;
    }) {
        const disposes: (() => void)[] = [];
        const setChannel = async (channel_id: string | null) => {
            disposes.forEach((it) => it());
            if (!channel_id) return;

            disposes.push(this.rpc.onEvt('MESSAGE_CREATE', async ({ message }) => {
                callbacks.message(message);
            }, { channel_id }));

            const voiceStates: RPCVoiceStates = { states: {} };
            disposes.push(this.rpc.onEvt('VOICE_STATE_CREATE', async (state) => {
                voiceStates.states[state.user.id] = state;
                callbacks.voiceState(voiceStates);
            }, { channel_id }));
            disposes.push(this.rpc.onEvt('VOICE_STATE_UPDATE', async (state) => {
                voiceStates.states[state.user.id] = state;
                callbacks.voiceState(voiceStates);
            }, { channel_id }));
            disposes.push(this.rpc.onEvt('VOICE_STATE_DELETE', async (state) => {
                delete voiceStates.states[state.user.id];
                callbacks.voiceState(voiceStates);
            }, { channel_id }));
            disposes.push(() => {
                callbacks.voiceState({ states: {} });
            });

            const speakingStates: RPCSpeakingStates = { states: {} };
            disposes.push(this.rpc.onEvt('SPEAKING_START', async (state) => {
                const existing = speakingStates.states[state.user_id];
                speakingStates.states[state.user_id] = {
                    speaking: true,
                    speaking_start: Date.now(),
                    speaking_stop: existing?.speaking_stop,
                };
                callbacks.speakingState(speakingStates);
            }, { channel_id }));
            disposes.push(this.rpc.onEvt('SPEAKING_STOP', async (state) => {
                const existing = speakingStates.states[state.user_id];
                speakingStates.states[state.user_id] = {
                    speaking: false,
                    speaking_start: existing?.speaking_start,
                    speaking_stop: Date.now(),
                };
                callbacks.speakingState(speakingStates);
            }, { channel_id }));
            disposes.push(() => {
                callbacks.speakingState({ states: {} });
            });
        };

        const session: RPCSession = {
            port: this.port,
            user: this.user,
        };
        this.rpc.onEvt('VOICE_CHANNEL_SELECT', async ({ guild_id, channel_id }) => {
            console.log(`${guild_id} / ${channel_id}`);
            if (!guild_id || !channel_id) {
                session.selected_voice_channel = undefined;
            } else {
                const channel = await this.rpc.dispatch('GET_CHANNEL', { channel_id }).wait();
                const guild = await this.rpc.dispatch('GET_GUILD', { guild_id }).wait();
                session.selected_voice_channel = {
                    ref: { guild_id, channel_id },
                    channel,
                    guild,
                };
            }
            setChannel(channel_id);
            callbacks.session(session);
        });
        const channel = await this.rpc.dispatch('GET_SELECTED_VOICE_CHANNEL', {}).wait();
        if (channel) {
            const guild = await this.rpc.dispatch('GET_GUILD', { guild_id: channel.guild_id }).wait();
            session.selected_voice_channel = {
                ref: { guild_id: channel.guild_id, channel_id: channel.id },
                channel,
                guild,
            };
            setChannel(channel.id);
            callbacks.session(session);
        }
    }

    public static async create(port: number, socket: OmuWS, fetch: (input: string, init?: RequestInit) => Promise<Response>, token?: string): Promise<DiscordRPCClient> {
        const rpc = new DiscordRPC(socket);
        await new Promise<void>((resolve, reject) => {
            const unlisten = () => {
                ready();
                error();
                closed();
            };
            const closed = rpc.onClosed((close) => {
                unlisten();
                reject(new Error(`Connection closed while connecting to ${port}: ${close.data.code} ${close.data.reason}`));
            });
            const error = rpc.onEvt('ERROR', (data) => {
                unlisten();
                reject(new Error(`Error occurred while connecting to ${port}: ${data.code} ${data.message}`));
            });
            const ready = rpc.onEvt('READY', () => {
                unlisten();
                resolve();
            });
        });
        if (token) {
            const resp = await rpc.dispatch('AUTHENTICATE', {
                access_token: token,
            }).wait();
            if ('user' in resp) {
                return new DiscordRPCClient(
                    port,
                    token,
                    resp.user,
                    rpc,
                );
            } else {
                console.warn(`Failed to connect with existing session ${port}: ${JSON.stringify(resp)}`);
            }
        }
        token = await this.authorize(rpc, fetch);
        const resp = await rpc.dispatch('AUTHENTICATE', {
            access_token: token,
        }).wait();
        if ('code' in resp) {
            throw new Error(`Failed to authnticate: ${resp.code} ${resp.message}`);
        }
        return new DiscordRPCClient(
            port,
            token,
            resp.user,
            rpc,
        );
    }

    public intoInfo(): RPCSession {
        return {
            port: this.port,
            user: this.user,
        };
    }

    public stop() {
        this.rpc.stop();
    }
}

export interface TokenRegistry {
    ports: Record<number, { token: string } | undefined>;
};

export interface ChannelReference {
    guild_id: string;
    channel_id: string;
};

export interface RPCSession {
    port: number;
    user: User;
    selected_voice_channel?: {
        ref: ChannelReference;
        channel: Channel;
        guild: Omit<Guild,
        'afk_timeout'
        | 'owner_id'
        | 'afk_timeout'
        | 'verification_level'
        | 'explicit_content_filter'
        | 'roles'
        | 'emojis'
        | 'features'
        | 'mfa_level'
        | 'system_channel_flags'
        | 'premium_tier'
        | 'preferred_locale'
        | 'nsfw_level'
        | 'premium_progress_bar_enabled'>;
    } | null;
};
export interface RPCVoiceStates {
    states: Record<string, VoiceStateCreatePayload['data']>;
};

export interface RPCSpeakingStates {
    states: Record<string, {
        speaking: boolean;
        speaking_start?: number;
        speaking_stop?: number;
    }>;
};

export interface RPCMessage {
    port: number;
    message: Message;
}

export class DiscordClientManager {
    constructor(
        private readonly omu: Omu,
        public readonly tokens: Registry<TokenRegistry>,
        public clients: DiscordRPCClient[] = [],
    ) {}

    private async fromPort(port: number): Promise<Result<DiscordRPCClient>> {
        const url = `ws://127.0.0.1:${port}/?v=1&client_id=${DISCORD_CLIENT_ID}`;
        const socket = await this.omu.http.ws(url, {
            headers: BASE_HEADERS,
        });
        const msg = await socket.receive();
        if (msg.type === 'error') {
            return { data: null, error: new Error(`Connection failed: ${msg.data.type}:${msg.data.reason}`) };
        }
        const sessions = await this.tokens.get();
        const existingToken = sessions.ports[port]?.token ?? undefined;
        const { data, error } = await tryCatch(DiscordRPCClient.create(
            port,
            socket,
            (input, init) => this.omu.http.fetch(input, init),
            existingToken,
        ));
        if (error) {
            return { data: null, error };
        }
        return { data, error: null };
    }

    public async refresh(port?: number, parallel = true): Promise<DiscordRPCClient[]> {
        const promises: Promise<DiscordRPCClient | undefined>[] = [];
        const ports: number[] = [];
        if (port) {
            ports.push(port);
        } else {
            for (let port = PORT_MIN; port <= PORT_MAX; port++) {
                ports.push(port);
            }
        }
        for (const port of ports) {
            if (parallel) {
                promises.push(this.fromPort(port).then(({ data, error }) => {
                    if (error) {
                        console.info(`Failed to connect to discord port: ${error}`);
                        return;
                    }
                    return data;
                }));
            } else {
                const { data, error } = await this.fromPort(port);
                if (error) {
                    console.info(`Failed to connect to discord port: ${error}`);
                    continue;
                }
                promises.push(Promise.resolve(data));
            }
        }
        const results = await Promise.all(promises);
        this.clients.forEach((client) => client.stop());
        this.clients = results.filter((it) => !!it);
        await this.tokens.modify((registry) => {
            this.clients.forEach((client) => {
                registry.ports[client.port] = {
                    token: client.token,
                };
            });
        });
        return this.clients;
    }
}

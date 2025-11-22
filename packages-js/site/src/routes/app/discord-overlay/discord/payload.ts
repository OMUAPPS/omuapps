import type { Activity, Application, Channel, Device, Guild, GuildMember, integer, ISO8601, Message, Pan, RPCServerConfiguration, Scope, snowflake, User, VoiceSettingsInput, VoiceSettingsMode, VoiceSettingsOutput, VoiceState, VoiceStateItem } from './type';

export interface Payload<Cmd> {
    cmd: Cmd;
    nonce: string;
};

export interface WithData<Data> {
    data: Data;
};

export interface WithArg<Args> {
    args: Args;
};

export interface WithNonce {
    nonce: string;
};

// #region DISPATCH

export interface DispatchPayload<Evt> extends Payload<'DISPATCH'> {
    evt: Evt;
};

export interface ReadyPayload extends DispatchPayload<'READY'>, WithData<{
    v: number;
    config: RPCServerConfiguration;
    user: User;
}> {};

export interface ErrorPayload extends DispatchPayload<'ERROR'>, WithData<{
    code: number;
    message: string;
}> {};

export interface GuildStatusPayload extends DispatchPayload<'GUILD_STATUS'>, WithData<{
    guild: Guild;
    online: number;
}> {};

export interface GuildCreatePayload extends DispatchPayload<'GUILD_CREATE'>, WithData<{
    id: string;
    name: string;
}> {};

export interface ChannelCreatePayload extends DispatchPayload<'CHANNEL_CREATE'>, WithData<{
    id: string;
    name: string;
    type: number;
}> {};

export interface VoiceChannelSelectPayload extends DispatchPayload<'VOICE_CHANNEL_SELECT'>, WithData<{
    channel_id: string | null;
    guild_id: string | null;
}> {};

export interface VoiceSettingsUpdatePayload extends DispatchPayload<'VOICE_SETTINGS_UPDATE'>, WithData<{
    input: {
        available_devices: {
            id: string;
            name: string;
        }[];
        device_id: string;
        volume: number;
    };
    output: {
        available_devices: {
            id: string;
            name: string;
        }[];
        device_id: string;
        volume: number;
    };
    mode: {
        type: string;
        auto_threshold: boolean;
        threshold: number;
        shortcut: { 'type': number; 'code': number; 'name': string }[];
        delay: number;
    };
    automatic_gain_control: boolean;
    echo_cancellation: boolean;
    noise_suppression: boolean;
    qos: boolean;
    silence_warning: boolean;
}> {};

export interface VoiceStateCreatePayload extends DispatchPayload<'VOICE_STATE_CREATE'>, WithData<VoiceStateItem>, WithArg<{
    channel_id: string;
}> {};

export interface VoiceStateUpdatePayload extends DispatchPayload<'VOICE_STATE_UPDATE'>, WithData<VoiceStateItem>, WithArg<{
    channel_id: string;
}> {};

export interface VoiceStateDeletePayload extends DispatchPayload<'VOICE_STATE_DELETE'>, WithData<VoiceStateItem>, WithArg<{
    channel_id: string;
}> {};

export interface VoiceConnectionStatus extends DispatchPayload<'VOICE_CONNECTION_STATUS'>, WithData<{
    state: string;
    hostname: string;
    pings: number[];
    average_ping: number;
    last_ping: number;
}> {}

export interface MessageCreatePayload extends DispatchPayload<'MESSAGE_CREATE'>, WithArg<{
    channel_id: string;
}>, WithData<{
        channel_id: string;
        message: Message;
    }> {}
export interface MessageUpdatePayload extends DispatchPayload< 'MESSAGE_UPDATE'>, WithArg<{
    channel_id: string;
}>, WithData<{
        channel_id: string;
        message: Message;
    }> {}
export interface MessageDeletePayload extends DispatchPayload<'MESSAGE_DELETE'>, WithArg<{
    channel_id: string;
}>, WithData<{
        channel_id: string;
        message: Message;
    }> {}

export interface SpeakingStartPayload extends DispatchPayload<'SPEAKING_START'>, WithData<{
    user_id: string;
}>, WithArg<{
        channel_id: string;
    }> {}
export interface SpeakingStopPayload extends DispatchPayload<'SPEAKING_STOP'>, WithData<{
    user_id: string;
}>, WithArg<{
        channel_id: string;
    }> {}

export interface NotificationCreatePayload extends DispatchPayload<'NOTIFICATION_CREATE'>, WithData<{
    channel_id: string;
    message: Message;
    icon_url: string;
    title: string;
    body: string;
}> {}

export interface ActivityJoin extends DispatchPayload<'ACTIVITY_JOIN'>, WithData<{
    secret: string;
}> {}

export interface ActivitySpectate extends DispatchPayload<'ACTIVITY_SPECTATE'>, WithData<{
    secret: string;
}> {}

export interface ActivityJoinRequest extends DispatchPayload<'ACTIVITY_JOIN_REQUEST'>, WithData<{
    user: {
        id: string;
        username: string;
        discriminator: string;
        avatar: string;
    };
}> {}

// #region Other

export interface AuthorizePayload extends Payload<'AUTHORIZE'>, WithArg<{
    client_id: string;
    scopes: Scope[];
    prompt?: 'none';
}>, WithData<{
        'code': string;
    }> {}

export interface AuthenticatePayload extends Payload<'AUTHENTICATE'>, WithArg<{
    access_token: string;
}>, WithData<{
    'application': Application;
    'expires': ISO8601;
    'user': User;
    'scopes': Scope[];
} | ErrorPayload['data']> {}

export interface GetGuildsPayload extends Payload<'GET_GUILDS'>, WithArg<{
    access_token: string;
}>, WithData<{
        guilds: Guild[];
    }> {}

export interface GetGuildPayload extends Payload<'GET_GUILD'>, WithArg<{
    guild_id: string;
}>, WithData<{
        id: string;
        name: string;
        icon_url: string | null;
        members: GuildMember[];
    }> {}

export interface GetChannelPayload extends Payload<'GET_CHANNEL'>, WithArg<{
    channel_id: string;
}>, WithData<{
        id: string;
        guild_id: string;
        name: string;
        type: integer;
        topic: string;
        bitrate: integer;
        user_limit: integer;
        position: integer;
        voice_states: VoiceState[];
        messages: Message[];
    }> {}

export interface GetChannelsPayload extends Payload<'GET_CHANNELS'>, WithArg<{
    guild_id: string;
}>, WithData<{
        channels: Channel[];
    }> {}

export interface SetUserVoiceSettingsPayload extends Payload<'SET_USER_VOICE_SETTINGS'>, WithArg<{
    user_id: string;
    pan?: Pan;
    volume?: integer;
    mute?: boolean;
}>, WithData<{
        user_id: string;
        pan?: Pan;
        volume?: integer;
        mute?: boolean;
    }> {}

export interface SelectVoiceChannelPayload extends Payload<'SELECT_VOICE_CHANNEL'>, WithArg<{
    channel_id: string | null;
    timeout?: integer;
    force?: boolean;
    navigate?: boolean;
}>, WithData<{
        id: string;
        name: string;
        type: number;
        bitrate: number;
        user_limit: number;
        guild_id: string;
        position: number;
        voice_states: [
            {
                voice_state: VoiceState;
                user: User;
                nick: string;
                mute: boolean;
                volume: number;
                pan: Pan;
            },
        ];
    }> {}

export interface GetSelectedVoiceChannelPayload extends Payload<'GET_SELECTED_VOICE_CHANNEL'>, WithArg<object>, WithData<GetChannelPayload['data'] | null> {}

export interface SelectTextChannelPayload extends Payload<'SELECT_TEXT_CHANNEL'>, WithArg<{
    channel_id: string;
    timeout: integer;
}>, WithData<{
        input: VoiceSettingsInput;
        output: VoiceSettingsOutput;
        mode: VoiceSettingsMode;
        automatic_gain_control: boolean;
        echo_cancellation: boolean;
        noise_suppression: boolean;
        qos: boolean;
        silence_warning: boolean;
        deaf: boolean;
        mute: boolean;
    }> {}

export interface SetVoiceSettingsPayload extends Payload<'SET_VOICE_SETTINGS'>, WithArg<{
    input: VoiceSettingsInput;
    output: VoiceSettingsOutput;
    mode: VoiceSettingsMode;
    automatic_gain_control: boolean;
    echo_cancellation: boolean;
    noise_suppression: boolean;
    qos: boolean;
    silence_warning: boolean;
    deaf: boolean;
    mute: boolean;
}>, WithData<{
        input: VoiceSettingsInput;
        output: VoiceSettingsOutput;
        mode: VoiceSettingsMode;
        automatic_gain_control: boolean;
        echo_cancellation: boolean;
        noise_suppression: boolean;
        qos: boolean;
        silence_warning: boolean;
        deaf: boolean;
        mute: boolean;
    }> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SubscribePayload extends Payload<'SUBSCRIBE'>, WithArg<any>, WithData<{
    evt: string;
}> {}

export interface UnsubscribePayload extends Payload<'UNSUBSCRIBE'>, WithArg<{
    evt: string;
}>, WithData<{
        evt: string;
    }> {}

export interface SetCertifiedDevicesPayload extends Payload<'SET_CERTIFIED_DEVICES'>, WithArg<{
    devices: Device[];
}>, WithData<null> {}
export interface SetActivityPayload extends Payload<'SET_ACTIVITY'>, WithArg<{
    pid: integer;
    activity: Activity;
}>, WithData<null> {}
export interface SendActivityJoinInvitePayload extends Payload<'SEND_ACTIVITY_JOIN_INVITE'>, WithArg<{
    user_id: snowflake;
}>, WithData<null> {}

export interface CloseActivityRequestPayload extends Payload<'CLOSE_ACTIVITY_REQUEST'>, WithArg<{
    user_id: snowflake;
}>, WithData<null> {}

export type Payloads =
    | ReadyPayload
    | ErrorPayload
    | GuildStatusPayload
    | GuildCreatePayload
    | ChannelCreatePayload
    | VoiceChannelSelectPayload
    | VoiceSettingsUpdatePayload
    | VoiceStateCreatePayload
    | VoiceStateUpdatePayload
    | VoiceStateDeletePayload
    | VoiceConnectionStatus
    | MessageCreatePayload
    | MessageUpdatePayload
    | MessageDeletePayload
    | SpeakingStartPayload
    | SpeakingStopPayload
    | NotificationCreatePayload
    | ActivityJoin
    | ActivitySpectate
    | ActivityJoinRequest
    | AuthorizePayload
    | AuthenticatePayload
    | GetGuildsPayload
    | GetGuildPayload
    | GetChannelPayload
    | GetChannelsPayload
    | SetUserVoiceSettingsPayload
    | SelectVoiceChannelPayload
    | GetSelectedVoiceChannelPayload
    | SelectTextChannelPayload
    | SetVoiceSettingsPayload
    | SubscribePayload
    | UnsubscribePayload
    | SetCertifiedDevicesPayload
    | SetActivityPayload
    | SendActivityJoinInvitePayload
    | CloseActivityRequestPayload;

export type DispatchPayloads = Extract<Payloads, { evt: string }>;
export type CommandPayloads = Extract<Exclude<Payloads, { evt: string }>, { args: unknown }>;

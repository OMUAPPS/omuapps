import type { AppJson } from '../../app.js';
import { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { PacketType } from './packet.js';

const IDENTIFIER = new Identifier('core', 'packet');

type ProtocolInfo = {
    version: string,
};

export type ServerMetaJson = {
    protocol: ProtocolInfo,
    hash: string | undefined,
};

type ConnectPacketJson = {
    app: AppJson,
    protocol: ProtocolInfo,
    token?: string,
    is_dashboard?: boolean,
};

export class ConnectPacket {
    public readonly app: App;
    public readonly protocol: ProtocolInfo;
    public readonly token?: string;
    
    constructor(options: {
        app: App,
        protocol: ProtocolInfo,
        token?: string,
    }) {
        this.app = options.app;
        this.protocol = options.protocol;
        this.token = options.token;
    }

    public static deserialize(data: ConnectPacketJson): ConnectPacket {
        return new ConnectPacket({
            app: App.deserialize(data.app),
            protocol: data.protocol,
            token: data.token,
        });
    }

    public static serialize(data: ConnectPacket): ConnectPacketJson {
        return {
            app: App.serialize(data.app),
            protocol: data.protocol,
            token: data.token,
        };
    }
}

export enum DisconnectType {
    INVALID_TOKEN = 'invalid_token',
    INVALID_ORIGIN = 'invalid_origin',
    INVALID_VERSION = 'invalid_version',
    INVALID_PACKET_TYPE = 'invalid_packet_type',
    INVALID_PACKET_DATA = 'invalid_packet_data',
    INVALID_PACKET = 'invalid_packet',
    INTERNAL_ERROR = 'internal_error',
    ANOTHER_CONNECTION = 'another_connection',
    PERMISSION_DENIED = 'permission_denied',
    SERVER_RESTART = 'server_restart',
    SHUTDOWN = 'shutdown',
    CLOSE = 'close',
}

type DisconnectPacketJson = {
    type: DisconnectType,
    message: string | null,
};

export class DisconnectPacket {
    public readonly type: DisconnectType;
    public readonly message: string | null;

    constructor(options: {
        type: DisconnectType,
        message?: string | null,
    }) {
        this.type = options.type;
        this.message = options.message ?? null;
    }

    public static serialize(data: DisconnectPacket): DisconnectPacketJson {
        return data.toJson();
    }

    public static deserialize(data: DisconnectPacketJson): DisconnectPacket {
        return DisconnectPacket.fromJson(data);
    }

    static fromJson(data: DisconnectPacketJson): DisconnectPacket {
        return new DisconnectPacket({
            type: data.type,
            message: data.message,
        });
    }

    toJson(): DisconnectPacketJson {
        return {
            type: this.type,
            message: this.message,
        };
    }
}

export const PACKET_TYPES: {
    SERVER_META: PacketType<ServerMetaJson>;
    CONNECT: PacketType<ConnectPacket>;
    DISCONNECT: PacketType<DisconnectPacket>;
    TOKEN: PacketType<string>;
    READY: PacketType<undefined>;
} = {
    SERVER_META: PacketType.createJson<ServerMetaJson>(IDENTIFIER, {
        name: 'server_meta',
    }),
    CONNECT: PacketType.createJson<ConnectPacket>(IDENTIFIER, {
        name: 'connect',
        serializer: ConnectPacket,
    }),
    DISCONNECT: PacketType.createJson<DisconnectPacket>(IDENTIFIER, {
        name: 'disconnect',
        serializer: DisconnectPacket,
    }),
    TOKEN: PacketType.createJson<string>(IDENTIFIER, {
        name: 'token',
    }),
    READY: PacketType.createJson<undefined>(IDENTIFIER, {
        name: 'ready',
    }),
};

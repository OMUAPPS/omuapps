import type { AppJson } from '../../app.js';
import { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { Serializer } from '../../serialize/serializer.js';
import { PacketType } from './packet.js';

const IDENTIFIER = new Identifier('core', 'packet');

type ProtocolInfo = {
    version: string;
};

type RSANumbers = {
    e: string;
    n: string;
};

type EncryptionRequest = {
    kind: 'v1';
    rsa: RSANumbers;
};

type EncryptionResponse = {
    kind: 'v1';
    rsa: RSANumbers;
    aes: string;
};

export type ServerMeta = {
    protocol: ProtocolInfo;
    encryption: EncryptionRequest | null;
    hash: string | undefined;
};

type ConnectPacketJson = {
    protocol: ProtocolInfo;
    app: AppJson;
    token: string;
    encryption: EncryptionResponse | null;
};

export class ConnectPacket {
    public readonly protocol: ProtocolInfo;
    public readonly app: App;
    public readonly token: string;
    public readonly encryption: EncryptionResponse | null;

    constructor(options: {
        protocol: ProtocolInfo;
        app: App;
        token: string;
        encryption?: EncryptionResponse | null;
    }) {
        this.protocol = options.protocol;
        this.app = options.app;
        this.token = options.token;
        this.encryption = options.encryption ?? null;
    }

    public static deserialize(data: ConnectPacketJson): ConnectPacket {
        return new ConnectPacket({
            protocol: data.protocol,
            app: App.deserialize(data.app),
            encryption: data.encryption,
            token: data.token,
        });
    }

    public static serialize(data: ConnectPacket): ConnectPacketJson {
        return {
            protocol: data.protocol,
            app: App.serialize(data.app),
            encryption: data.encryption,
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
    type: DisconnectType;
    message: string | null;
};

export class DisconnectPacket {
    public readonly type: DisconnectType;
    public readonly message: string | null;

    constructor(options: {
        type: DisconnectType;
        message?: string | null;
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
    SERVER_META: PacketType<ServerMeta>;
    CONNECT: PacketType<ConnectPacket>;
    DISCONNECT: PacketType<DisconnectPacket>;
    TOKEN: PacketType<string>;
    READY: PacketType<undefined>;
    ENCRYPTED_PACKET: PacketType<Uint8Array>;
} = {
    SERVER_META: PacketType.createJson<ServerMeta>(IDENTIFIER, {
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
    ENCRYPTED_PACKET: PacketType.createSerialized<Uint8Array>(IDENTIFIER, {
        name: 'e',
        serializer: Serializer.noop(),
    }),
};

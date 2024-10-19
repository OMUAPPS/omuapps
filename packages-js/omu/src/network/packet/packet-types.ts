import type { AppJson } from '../../app.js';
import { App } from '../../app.js';
import { Identifier } from '../../identifier.js';
import type { Model } from '../../model.js';
import { Serializer } from '../../serializer.js';

import { PacketType } from './packet.js';

const IDENTIFIER = new Identifier('core', 'packet');

type ProtocolInfo = {
    version: string,
};

type ConnectPacketJson = {
    app: AppJson,
    protocol: ProtocolInfo,
    token?: string,
    is_dashboard?: boolean,
};

export class ConnectPacket implements Model<ConnectPacketJson> {
    public readonly app: App;
    public readonly protocol: ProtocolInfo;
    public readonly token?: string;
    public readonly isDashboard?: boolean;
    
    constructor(options: {
        app: App,
        protocol: ProtocolInfo,
        token?: string,
        is_dashboard?: boolean,
    }) {
        this.app = options.app;
        this.protocol = options.protocol;
        this.token = options.token;
        this.isDashboard = options.is_dashboard;
    }

    public static fromJson(data: ConnectPacketJson): ConnectPacket {
        return new ConnectPacket({
            app: App.fromJson(data.app),
            protocol: data.protocol,
            token: data.token,
            is_dashboard: data.is_dashboard,
        });
    }

    public toJson(): ConnectPacketJson {
        return {
            app: this.app.toJson(),
            protocol: this.protocol,
            token: this.token,
            is_dashboard: this.isDashboard,
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
    ANOTHER_CONNECTION = 'another_connection',
    PERMISSION_DENIED = 'permission_denied',
    SHUTDOWN = 'shutdown',
    CLOSE = 'close',
}

type DisconnectPacketJson = {
    type: DisconnectType,
    message: string | null,
};

export class DisconnectPacket implements Model<DisconnectPacketJson> {
    public readonly type: DisconnectType;
    public readonly message: string | null;

    constructor(options: {
        type: DisconnectType,
        message?: string | null,
    }) {
        this.type = options.type;
        this.message = options.message ?? null;
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

export const PACKET_TYPES = {
    CONNECT: PacketType.createJson<ConnectPacket>(IDENTIFIER, {
        name: 'connect',
        serializer: Serializer.model(ConnectPacket),
    }),
    DISCONNECT: PacketType.createJson<DisconnectPacket>(IDENTIFIER, {
        name: 'disconnect',
        serializer: Serializer.model(DisconnectPacket),
    }),
    TOKEN: PacketType.createJson<string>(IDENTIFIER, {
        name: 'token',
    }),
    READY: PacketType.createJson<undefined>(IDENTIFIER, {
        name: 'ready',
    }),
};

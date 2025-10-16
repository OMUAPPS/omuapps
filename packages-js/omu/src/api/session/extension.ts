import { App, AppJson } from '../../app';
import { Identifier, IdentifierMap, IdentifierSet, IntoId } from '../../identifier';
import { Locale, LocalizedText } from '../../localization';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint';
import { Extension, ExtensionType } from '../extension';
import { SessionObserver } from '../server/extension';
import { Table, TableType } from '../table';

export const SESSION_EXTENSION_TYPE: ExtensionType<SessionExtension> = new ExtensionType('sessions', (omu: Omu) => new SessionExtension(omu));

export const SESSIONS_READ_PERMISSION_ID: Identifier = SESSION_EXTENSION_TYPE.join('read');
const SESSION_TABLE_TYPE = TableType.createJson(SESSION_EXTENSION_TYPE, {
    name: 'sessions',
    serializer: App,
    key: (app) => app.id.key(),
    permissions: {
        read: SESSIONS_READ_PERMISSION_ID,
    },
});
const REQUIRE_APPS_PACKET_TYPE = PacketType.createJson<Identifier[]>(SESSION_EXTENSION_TYPE, {
    name: 'require',
    serializer: Serializer.of(Identifier).toArray(),
});
const SESSION_OBSERVE_PACKET_TYPE = PacketType.createJson<Identifier[]>(SESSION_EXTENSION_TYPE, {
    name: 'observe',
    serializer: Serializer.of(Identifier).toArray(),
});
const SESSION_CONNECTED_PACKET_TYPE = PacketType.createJson<App>(SESSION_EXTENSION_TYPE, {
    name: 'session_connected',
    serializer: App,
});
const SESSION_DISCONNECTED_PACKET_TYPE = PacketType.createJson<App>(SESSION_EXTENSION_TYPE, {
    name: 'session_disconnected',
    serializer: App,
});

type RemoteAppRequestPayload = {
    id: string;
    url: string;
    metadata: {
        locale: Locale;
        name?: LocalizedText;
        icon?: LocalizedText;
        description?: LocalizedText;
    };
    permissions: string[];
};

export type RequestRemoteAppResponse = {
    type: 'success';
    token: string;
    lan_ip: string;
} | {
    type: 'error';
    message: string;
};

export const REMOTE_APP_REQUEST_PERMISSION_ID: Identifier = SESSION_EXTENSION_TYPE.join('remote_app', 'request');

const REMOTE_APP_REQUEST_ENDPOINT_TYPE = EndpointType.createJson<RemoteAppRequestPayload, RequestRemoteAppResponse>(SESSION_EXTENSION_TYPE, {
    name: 'remote_app_request',
    permissionId: REMOTE_APP_REQUEST_PERMISSION_ID,
});

export type GenerateTokenResponse = {
    type: 'success';
    token: string;
} | {
    type: 'error';
    message: string;
};

export const GENERATE_TOKEN_PERMISSION_ID: Identifier = SESSION_EXTENSION_TYPE.join('generate_token');

type GenerateTokenPayload = {
    app: AppJson;
    permissions: string[];
};

const GENERATE_TOKEN_ENDPOINT_TYPE = EndpointType.createJson<GenerateTokenPayload, GenerateTokenResponse>(SESSION_EXTENSION_TYPE, {
    name: 'generate_token',
    permissionId: GENERATE_TOKEN_PERMISSION_ID,
});

export class SessionExtension implements Extension {
    public readonly type: ExtensionType<SessionExtension> = SESSION_EXTENSION_TYPE;
    public readonly sessions: Table<App>;
    private readonly sessionObservers = new IdentifierMap<SessionObserver>();
    private readonly requiredApps = new IdentifierSet();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            REQUIRE_APPS_PACKET_TYPE,
            SESSION_OBSERVE_PACKET_TYPE,
            SESSION_CONNECTED_PACKET_TYPE,
            SESSION_DISCONNECTED_PACKET_TYPE,
        );
        omu.network.addPacketHandler(
            SESSION_CONNECTED_PACKET_TYPE, (app) => this.handleSessionConnect(app),
        );
        omu.network.addPacketHandler(
            SESSION_DISCONNECTED_PACKET_TYPE, (app) => this.handleSessionDisconnect(app),
        );
        this.sessions = omu.tables.get(SESSION_TABLE_TYPE);
        omu.network.addTask(() => this.onTask());
        omu.onReady(() => this.onReady());
    }

    public async has(id: Identifier): Promise<boolean> {
        return await this.sessions.has(id.key());
    }

    public observe(appId: Identifier, {
        onConnect,
        onDisconnect,
    }: {
        onConnect(app: App): void;
        onDisconnect(app: App): void;
    }): SessionObserver {
        if (this.omu.running) {
            this.omu.send(SESSION_OBSERVE_PACKET_TYPE, [appId]);
        }
        const observer = this.sessionObservers.get(appId) ?? new SessionObserver([], []);
        observer.onConnect(onConnect);
        observer.onDisconnect(onDisconnect);
        this.sessionObservers.set(appId, observer);
        return observer;
    }

    private async handleSessionConnect(app: App): Promise<void> {
        const observer = this.sessionObservers.get(app.id);
        if (!observer) {
            return;
        }
        for (const callback of observer.onConnectCallbacks) {
            await callback(app);
        }
    }

    private async handleSessionDisconnect(app: App): Promise<void> {
        const observer = this.sessionObservers.get(app.id);
        if (!observer) {
            return;
        }
        for (const callback of observer.onDisconnectCallbacks) {
            await callback(app);
        }
    }

    public require(...appIds: Identifier[]): void {
        if (this.omu.running) {
            throw new Error('Cannot require apps after the client has started');
        }
        for (const appId of appIds) {
            this.requiredApps.add(appId);
        }
    }

    private async onTask(): Promise<void> {
        if (this.requiredApps.size > 0) {
            this.omu.send(REQUIRE_APPS_PACKET_TYPE, Array.from(this.requiredApps.values()));
        }
    }

    private async onReady(): Promise<void> {
        if (this.sessionObservers.size > 0) {
            this.omu.send(SESSION_OBSERVE_PACKET_TYPE, Array.from(this.sessionObservers.keys()));
        }
    }

    public async requestRemoteApp(payload: {
        app: App;
        permissions: IntoId[];
    }): Promise<RequestRemoteAppResponse> {
        const { app } = payload;
        if (!app.url) {
            throw new Error('App must have a URL to request it remotely');
        }
        if (app.type !== 'remote') {
            throw new Error('App must be a remote app to request it remotely');
        }
        if (!app.metadata) {
            throw new Error('App must have metadata to request it remotely');
        }
        return this.omu.endpoints.call(REMOTE_APP_REQUEST_ENDPOINT_TYPE, {
            id: app.id.key(),
            url: app.url,
            metadata: app.metadata,
            permissions: payload.permissions.map(id => Identifier.from(id).key()),
        });
    }

    public async generateToken(options: {
        app: App;
        permissions: IntoId[];
        keepPermissions?: boolean;
    }): Promise<GenerateTokenResponse> {
        return this.omu.endpoints.call(GENERATE_TOKEN_ENDPOINT_TYPE, {
            app: App.serialize(options.app),
            permissions: options.permissions.map(id => Identifier.from(id).key()),
        });
    }
}

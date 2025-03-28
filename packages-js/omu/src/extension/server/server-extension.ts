import { App } from '../../app.js';
import type { Client } from '../../client.js';
import { Identifier, IdentifierMap, IdentifierSet } from '../../identifier.js';
import { Locale } from '../../localization/locale.js';
import { LocalizedText } from '../../localization/localization.js';
import { PacketType } from '../../network/packet/packet.js';
import { Serializer } from '../../serializer.js';
import { EndpointType } from '../endpoint/endpoint.js';
import type { Extension } from '../extension.js';
import { ExtensionType } from '../extension.js';
import { Registry, RegistryPermissions, RegistryType } from '../registry/registry.js';
import type { Table } from '../table/index.js';
import { TABLE_EXTENSION_TYPE } from '../table/table-extension.js';
import { TableType } from '../table/table.js';

export const SERVER_EXTENSION_TYPE: ExtensionType<ServerExtension> = new ExtensionType(
    'server',
    (client: Client) => new ServerExtension(client),
    () => [TABLE_EXTENSION_TYPE],
);

export const SERVER_APPS_READ_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('apps', 'read');
const APP_TABLE_TYPE = TableType.createModel(SERVER_EXTENSION_TYPE, {
    name: 'apps',
    model: App,
    permissions: {
        read: SERVER_APPS_READ_PERMISSION_ID,
    },
});

export const SERVER_SESSIONS_READ_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('sessions', 'read');
const SESSION_TABLE_TYPE = TableType.createModel(SERVER_EXTENSION_TYPE, {
    name: 'sessions',
    model: App,
    permissions: {
        read: SERVER_APPS_READ_PERMISSION_ID,
    },
});
export const SERVER_SHUTDOWN_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('shutdown');
const SHUTDOWN_ENDPOINT_TYPE = EndpointType.createJson<boolean, boolean>(SERVER_EXTENSION_TYPE, {
    name: 'shutdown',
    permissionId: SERVER_SHUTDOWN_PERMISSION_ID,
});
const REQUIRE_APPS_PACKET_TYPE = PacketType.createJson<Identifier[]>(SERVER_EXTENSION_TYPE, {
    name: 'require_apps',
    serializer: Serializer.model(Identifier).toArray(),
});
export const TRUSTED_ORIGINS_GET_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('trusted_origins', 'get');
export const TRUSTED_ORIGINS_SET_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('trusted_origins', 'set');
const TRUSTED_ORIGINS_REGISTRY_TYPE = RegistryType.createJson<string[]>(SERVER_EXTENSION_TYPE, {
    name: 'trusted_origins',
    defaultValue: [],
    permissions: new RegistryPermissions(
        TRUSTED_ORIGINS_GET_PERMISSION_ID,
        TRUSTED_ORIGINS_SET_PERMISSION_ID,
    ),
});
const SESSION_OBSERVE_PACKET_TYPE = PacketType.createJson<Identifier[]>(SERVER_EXTENSION_TYPE, {
    name: 'session_observe',
    serializer: Serializer.model(Identifier).toArray(),
});
const SESSION_CONNECT_PACKET_TYPE = PacketType.createJson<App>(SERVER_EXTENSION_TYPE, {
    name: 'session_connect',
    serializer: Serializer.model(App),
});
const SESSION_DISCONNECT_PACKET_TYPE = PacketType.createJson<App>(SERVER_EXTENSION_TYPE, {
    name: 'session_disconnect',
    serializer: Serializer.model(App),
});
type RemoteAppRequestPayload = {
    id: string;
    url: string;
    metadata: {
        locale: Locale;
        name?: LocalizedText;
        icon?: LocalizedText;
        description?: LocalizedText;
    },
    permissions: string[];
}

export type RequestRemoteAppResponse = {
    type: 'success';
    token: string;
    lan_ip: string;
} | {
    type: 'error';
    message: string;
}

export const REMOTE_APP_REQUEST_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('remote_app', 'request');
const REMOTE_APP_REQUEST_ENDPOINT_TYPE = EndpointType.createJson<RemoteAppRequestPayload, RequestRemoteAppResponse>(SERVER_EXTENSION_TYPE, {
    name: 'remote_app_request',
    permissionId: REMOTE_APP_REQUEST_PERMISSION_ID,
});

export class ServerExtension implements Extension {
    public readonly type: ExtensionType<ServerExtension> = SERVER_EXTENSION_TYPE;
    public readonly apps: Table<App>;
    public readonly sessions: Table<App>;
    public readonly trustedOrigins: Registry<string[]>;
    private readonly sessionObservers = new IdentifierMap<SessionObserver>();
    private readonly requiredApps = new IdentifierSet();

    constructor(private readonly client: Client) {
        client.network.registerPacket(
            REQUIRE_APPS_PACKET_TYPE,
            SESSION_OBSERVE_PACKET_TYPE,
            SESSION_CONNECT_PACKET_TYPE,
            SESSION_DISCONNECT_PACKET_TYPE,
        );
        client.network.addPacketHandler(
            SESSION_CONNECT_PACKET_TYPE, (app) => this.handleSessionConnect(app)
        )
        client.network.addPacketHandler(
            SESSION_DISCONNECT_PACKET_TYPE, (app) => this.handleSessionDisconnect(app)
        )
        this.apps = client.tables.get(APP_TABLE_TYPE);
        this.sessions = client.tables.get(SESSION_TABLE_TYPE);
        this.trustedOrigins = client.registries.get(TRUSTED_ORIGINS_REGISTRY_TYPE);
        client.network.addTask(() => this.onTask());
        client.onReady(() => this.onReady());
    }

    private async onTask(): Promise<void> {
        if (this.requiredApps.size > 0) {
            this.client.send(REQUIRE_APPS_PACKET_TYPE, Array.from(this.requiredApps.values()));
        }
    }

    private async onReady(): Promise<void> {
        if (this.sessionObservers.size > 0) {
            this.client.send(SESSION_OBSERVE_PACKET_TYPE, Array.from(this.sessionObservers.keys()));
        }
    }

    public async shutdown(restart?: boolean): Promise<boolean> {
        this.client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart ?? false);
        await new Promise<void>((resolve) => {
            const unlisten = this.client.network.event.disconnected.listen(() => {
                resolve();
                unlisten();
            });
        });
        return true;
    }

    public observeSession(appId: Identifier, {
        onConnect,
        onDisconnect
    }: {
        onConnect(app: App): void;
        onDisconnect(app: App): void;
    }): SessionObserver {
        if (this.client.running) {
            this.client.send(SESSION_OBSERVE_PACKET_TYPE, [appId]);
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
        if (this.client.running) {
            throw new Error('Cannot require apps after the client has started');
        }
        for (const appId of appIds) {
            this.requiredApps.add(appId);
        }
    }

    public async requestRemoteApp(payload: {
        app: App;
        permissions: (string | Identifier)[];
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
        return this.client.endpoints.call(REMOTE_APP_REQUEST_ENDPOINT_TYPE, {
            id: app.id.key(),
            url: app.url,
            metadata: app.metadata,
            permissions: payload.permissions.map((permission) => {
                return typeof permission === 'string' ? permission : permission.key();
            }),
        });
    }
}

export class SessionObserver {
    constructor(
        public readonly onConnectCallbacks: Array<(app: App) => Promise<void> | void>,
        public readonly onDisconnectCallbacks: Array<(app: App) => Promise<void> | void>,
    ) { }

    public onConnect(callback: (app: App) => Promise<void> | void): void {
        this.onConnectCallbacks.push(callback);
    }

    public onDisconnect(callback: (app: App) => Promise<void> | void): void {
        this.onDisconnectCallbacks.push(callback);
    }
}

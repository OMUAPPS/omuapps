import { App, AppJson } from '../../app.js';
import { Identifier, IdentifierMap } from '../../identifier';
import { Omu } from '../../omu.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType, type Extension } from '../extension.js';
import { Registry, RegistryType } from '../registry';
import { TableType, type Table } from '../table';

export const SERVER_EXTENSION_TYPE: ExtensionType<ServerExtension> = new ExtensionType(
    'server',
    (omu: Omu) => new ServerExtension(omu),
);

export interface AppIndexEntry {
    url: string;
    added_at: string;
};

export interface AppIndex {
    indexes: Record<string, AppIndexEntry>;
};

export const SERVER_APPS_READ_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('apps', 'read');
export const SERVER_APPS_WRITE_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('apps', 'write');
export const SERVER_INDEX_READ_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('index', 'read');
export const SERVER_INDEX_REGISTRY_TYPE: RegistryType<AppIndex> = RegistryType.createJson<AppIndex>(SERVER_EXTENSION_TYPE, {
    name: 'index',
    defaultValue: { 'indexes': {} },
    permissions: {
        write: SERVER_APPS_WRITE_PERMISSION_ID,
        read: SERVER_INDEX_READ_PERMISSION_ID,
    },
});
const APP_TABLE_TYPE = TableType.createJson(SERVER_EXTENSION_TYPE, {
    name: 'apps',
    serializer: App,
    key: (app) => app.id.key(),
    permissions: {
        all: SERVER_APPS_WRITE_PERMISSION_ID,
        read: SERVER_APPS_READ_PERMISSION_ID,
    },
});

export const SERVER_SHUTDOWN_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('shutdown');
const SHUTDOWN_ENDPOINT_TYPE = EndpointType.createJson<boolean, boolean>(SERVER_EXTENSION_TYPE, {
    name: 'shutdown',
    permissionId: SERVER_SHUTDOWN_PERMISSION_ID,
});
export const TRUSTED_ORIGINS_GET_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('trusted_origins', 'get');
export const TRUSTED_ORIGINS_SET_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('trusted_origins', 'set');
const TRUSTED_HOSTS_REGISTRY_TYPE = RegistryType.createJson<Record<string, string>>(SERVER_EXTENSION_TYPE, {
    name: 'trusted_hosts',
    defaultValue: {},
    permissions: {
        read: TRUSTED_ORIGINS_GET_PERMISSION_ID,
        write: TRUSTED_ORIGINS_SET_PERMISSION_ID,
    },
});

export class ServerExtension implements Extension {
    public readonly type: ExtensionType<ServerExtension> = SERVER_EXTENSION_TYPE;
    public readonly apps: Table<App>;
    public readonly index: Registry<AppIndex>;
    public readonly trustedHosts: Registry<Record<string, string>>;

    constructor(private readonly omu: Omu) {
        this.apps = omu.tables.get(APP_TABLE_TYPE);
        this.index = omu.registries.get(SERVER_INDEX_REGISTRY_TYPE);
        this.trustedHosts = omu.registries.get(TRUSTED_HOSTS_REGISTRY_TYPE);
    }

    public async shutdown(restart?: boolean): Promise<boolean> {
        this.omu.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart ?? false);
        await new Promise<void>((resolve) => {
            const unlisten = this.omu.network.event.disconnected.listen(() => {
                resolve();
                unlisten();
            });
        });
        return true;
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

export interface AppIndexRegistryJSON {
    id: string;
    apps: Record<string, AppJson>;
}

export class AppIndexRegistry {
    constructor(
        public id: Identifier,
        public apps: IdentifierMap<App>,
    ) { }

    public static fromJSON(json: AppIndexRegistryJSON): AppIndexRegistry {
        const id = Identifier.fromKey(json['id']);
        const apps = new IdentifierMap<App>();
        for (const [idStr, appJSON] of Object.entries(json['apps'])) {
            const id = Identifier.fromKey(idStr);
            const app = App.deserialize(appJSON);
            if (!id.isNamespaceEqual(app.id)) {
                throw new Error(`App ID does not match the ID in the index. ${app.id} != ${id}`);
            }
            apps.set(id, app);
        }
        return new AppIndexRegistry(
            id,
            apps,
        );
    }
}

import { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { Omu } from '../../omu.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType, type Extension } from '../extension.js';
import { Registry, RegistryPermissions, RegistryType } from '../registry';
import { TableType, type Table } from '../table';

export const SERVER_EXTENSION_TYPE: ExtensionType<ServerExtension> = new ExtensionType(
    'server',
    (omu: Omu) => new ServerExtension(omu),
);

export const SERVER_APPS_READ_PERMISSION_ID: Identifier = SERVER_EXTENSION_TYPE.join('apps', 'read');
const APP_TABLE_TYPE = TableType.createJson(SERVER_EXTENSION_TYPE, {
    name: 'apps',
    serializer: App,
    key: (app) => app.id.key(),
    permissions: {
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
const TRUSTED_ORIGINS_REGISTRY_TYPE = RegistryType.createJson<string[]>(SERVER_EXTENSION_TYPE, {
    name: 'trusted_origins',
    defaultValue: [],
    permissions: new RegistryPermissions(
        TRUSTED_ORIGINS_GET_PERMISSION_ID,
        TRUSTED_ORIGINS_SET_PERMISSION_ID,
    ),
});

export class ServerExtension implements Extension {
    public readonly type: ExtensionType<ServerExtension> = SERVER_EXTENSION_TYPE;
    public readonly apps: Table<App>;
    public readonly trustedOrigins: Registry<string[]>;

    constructor(private readonly omu: Omu) {
        this.apps = omu.tables.get(APP_TABLE_TYPE);
        this.trustedOrigins = omu.registries.get(TRUSTED_ORIGINS_REGISTRY_TYPE);
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

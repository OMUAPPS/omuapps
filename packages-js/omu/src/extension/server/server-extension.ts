import { App } from '../../app.js';
import type { Client } from '../../client.js';
import { Identifier, IdentifierSet } from '../../identifier.js';
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

export const SERVER_APPS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE.join('apps', 'read');
const APP_TABLE_TYPE = TableType.createModel(SERVER_EXTENSION_TYPE, {
    name: 'apps',
    model: App,
    permissions: {
        read: SERVER_APPS_READ_PERMISSION_ID,
    },
});

export const SERVER_SESSIONS_READ_PERMISSION_ID = SERVER_EXTENSION_TYPE.join('sessions', 'read');
const SESSION_TABLE_TYPE = TableType.createModel(SERVER_EXTENSION_TYPE, {
    name: 'sessions',
    model: App,
    permissions: {
        read: SERVER_APPS_READ_PERMISSION_ID,
    },
});
export const SERVER_SHUTDOWN_PERMISSION_ID = SERVER_EXTENSION_TYPE.join('shutdown');
const SHUTDOWN_ENDPOINT_TYPE = EndpointType.createJson<boolean, boolean>(SERVER_EXTENSION_TYPE, {
    name: 'shutdown',
    permissionId: SERVER_SHUTDOWN_PERMISSION_ID,
});
const REQUIRE_APPS_PACKET_TYPE = PacketType.createJson<Identifier[]>(SERVER_EXTENSION_TYPE, {
    name: 'require_apps',
    serializer: Serializer.model(Identifier).toArray(),
});
export const TRUSTED_ORIGINS_GET_PERMISSION_ID = SERVER_EXTENSION_TYPE.join('trusted_origins', 'get');
export const TRUSTED_ORIGINS_SET_PERMISSION_ID = SERVER_EXTENSION_TYPE.join('trusted_origins', 'set');
const TRUSTED_ORIGINS_REGISTRY_TYPE = RegistryType.createJson<string[]>(SERVER_EXTENSION_TYPE, {
    name: 'trusted_origins',
    defaultValue: [],
    permissions: new RegistryPermissions(
        TRUSTED_ORIGINS_GET_PERMISSION_ID,
        TRUSTED_ORIGINS_SET_PERMISSION_ID,
    ),
});

export class ServerExtension implements Extension {
    public readonly type = SERVER_EXTENSION_TYPE;
    public readonly apps: Table<App>;
    public readonly sessions: Table<App>;
    public readonly trustedOrigins: Registry<string[]>;
    private requiredApps = new IdentifierSet();

    constructor(private readonly client: Client) {
        client.network.registerPacket(REQUIRE_APPS_PACKET_TYPE);
        this.apps = client.tables.get(APP_TABLE_TYPE);
        this.sessions = client.tables.get(SESSION_TABLE_TYPE);
        this.trustedOrigins = client.registries.get(TRUSTED_ORIGINS_REGISTRY_TYPE);
        client.network.addTask(() => this.onTask());
    }

    private async onTask(): Promise<void> {
        this.client.send(REQUIRE_APPS_PACKET_TYPE, Array.from(this.requiredApps.values()));
    }

    public async shutdown(restart?: boolean): Promise<boolean> {
        return await this.client.endpoints.call(SHUTDOWN_ENDPOINT_TYPE, restart ?? false);
    }

    public require(...appIds: Identifier[]): void {
        if (this.client.running) {
            throw new Error('Cannot require apps after the client has started');
        }
        for (const appId of appIds) {
            this.requiredApps.add(appId);
        }
    }
}

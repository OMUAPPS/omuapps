import type { Client } from '../../client.js';
import { Identifier, IdentifierMap, IdentifierSet } from '../../identifier.js';
import { PacketType } from '../../network/packet/packet.js';
import { Serializer } from '../../serializer.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';

import { PermissionType } from './permission.js';

export const PERMISSION_EXTENSION_TYPE = new ExtensionType(
    'permission',
    (client) => new PermissionExtension(client),
);
const PERMISSION_REGISTER_PACKET = PacketType.createJson<PermissionType[]>(
    PERMISSION_EXTENSION_TYPE,
    {
        name: 'register',
        serializer: Serializer.model(PermissionType).toArray(),
    },
);
const PERMISSION_REQUIRE_PACKET = PacketType.createJson<Identifier[]>(PERMISSION_EXTENSION_TYPE, {
    name: 'require',
    serializer: Serializer.model(Identifier).toArray(),
});
const PERMISSION_REQUEST_ENDPOINT = EndpointType.createJson<Identifier[], void>(
    PERMISSION_EXTENSION_TYPE,
    {
        name: 'request',
        requestSerializer: Serializer.model(Identifier).toArray(),
    },
);
const PERMISSION_GRANT_PACKET = PacketType.createJson<PermissionType[]>(PERMISSION_EXTENSION_TYPE, {
    name: 'grant',
    serializer: Serializer.model(PermissionType).toArray(),
});

export class PermissionExtension {
    public readonly type = PERMISSION_EXTENSION_TYPE;
    private permissions = new IdentifierMap<PermissionType>();
    private readonly registeredPermissions = new IdentifierMap<PermissionType>();
    private readonly requiredPermissions = new IdentifierSet();

    constructor(private readonly client: Client) {
        client.network.registerPacket(
            PERMISSION_REGISTER_PACKET,
            PERMISSION_REQUIRE_PACKET,
            PERMISSION_GRANT_PACKET,
        );
        client.network.addPacketHandler(PERMISSION_GRANT_PACKET, (permissions) => {
            for (const permission of permissions) {
                this.permissions.set(permission.id, permission);
            }
        });
        client.network.addTask(() => this.onTask());
    }

    private onTask(): void {
        if (this.client.app.type === 'remote') {
            return;
        }
        if (this.registeredPermissions.size > 0) {
            this.client.send(
                PERMISSION_REGISTER_PACKET,
                Array.from(this.registeredPermissions.values()),
            );
        }
        if (this.requiredPermissions.size > 0) {
            this.client.send(
                PERMISSION_REQUIRE_PACKET,
                Array.from(this.requiredPermissions.values()),
            );
        }
    }

    public register(permission: PermissionType): void {
        if (this.client.running) {
            this.client.send(PERMISSION_REGISTER_PACKET, [permission]);
        }
        this.registeredPermissions.set(permission.id, permission);
    }

    public require(...permissionIds: (Identifier | string)[]): void {
        const ids: Identifier[] = permissionIds.map((id) =>
            typeof id === 'string' ? Identifier.fromKey(id) : id,
        );
        const missing = ids.filter((id) => !this.permissions.has(id));
        if (this.client.running) {
            if (missing.length > 0) {
                throw new Error('Permissions must be registered before the client starts');
            }
            return;
        }
        for (const id of ids) {
            this.requiredPermissions.add(id);
        }
    }

    public async request(...permissionIds: Identifier[]): Promise<void> {
        await this.client.endpoints.call(PERMISSION_REQUEST_ENDPOINT, permissionIds);
    }

    public has(permissionIdentifier: Identifier): boolean {
        return this.permissions.has(permissionIdentifier);
    }
}

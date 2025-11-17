import { Identifier, IdentifierMap, IdentifierSet, IntoId } from '../../identifier';
import { PacketType } from '../../network/packet/packet.js';
import { Omu } from '../../omu';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';

import { PermissionType } from './permission.js';

export const PERMISSION_EXTENSION_TYPE: ExtensionType<PermissionExtension> = new ExtensionType(
    'permission',
    (client) => new PermissionExtension(client),
);
const PERMISSION_REGISTER_PACKET = PacketType.createJson<PermissionType[]>(
    PERMISSION_EXTENSION_TYPE,
    {
        name: 'register',
        serializer: Serializer.of(PermissionType).toArray(),
    },
);
const PERMISSION_REQUIRE_PACKET = PacketType.createJson<Identifier[]>(PERMISSION_EXTENSION_TYPE, {
    name: 'require',
    serializer: Serializer.of(Identifier).toArray(),
});
const PERMISSION_REQUEST_ENDPOINT = EndpointType.createJson<Identifier[], void>(
    PERMISSION_EXTENSION_TYPE,
    {
        name: 'request',
        requestSerializer: Serializer.of(Identifier).toArray(),
    },
);
const PERMISSION_GRANT_PACKET = PacketType.createJson<PermissionType[]>(PERMISSION_EXTENSION_TYPE, {
    name: 'grant',
    serializer: Serializer.of(PermissionType).toArray(),
});

export class PermissionExtension {
    public readonly type: ExtensionType<PermissionExtension> = PERMISSION_EXTENSION_TYPE;
    private permissions = new IdentifierMap<PermissionType>();
    private readonly registeredPermissions = new IdentifierMap<PermissionType>();
    private readonly requiredPermissions = new IdentifierSet();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            PERMISSION_REGISTER_PACKET,
            PERMISSION_REQUIRE_PACKET,
            PERMISSION_GRANT_PACKET,
        );
        omu.network.addPacketHandler(PERMISSION_GRANT_PACKET, (permissions) => {
            for (const permission of permissions) {
                this.permissions.set(permission.id, permission);
            }
        });
        omu.network.addTask(() => this.onTask());
    }

    private onTask(): void {
        if (this.omu.app.type === 'remote') {
            return;
        }
        if (this.registeredPermissions.size > 0) {
            this.omu.send(
                PERMISSION_REGISTER_PACKET,
                Array.from(this.registeredPermissions.values()),
            );
        }
        if (this.requiredPermissions.size > 0) {
            this.omu.send(
                PERMISSION_REQUIRE_PACKET,
                Array.from(this.requiredPermissions.values()),
            );
        }
    }

    public register(permission: PermissionType): void {
        if (this.omu.running) {
            this.omu.send(PERMISSION_REGISTER_PACKET, [permission]);
        }
        this.registeredPermissions.set(permission.id, permission);
    }

    public require(...permissionIds: IntoId[]): void {
        const ids = permissionIds.map(Identifier.from);
        const missing = ids.filter((id) => !this.permissions.has(id));
        if (this.omu.running) {
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
        await this.omu.endpoints.call(PERMISSION_REQUEST_ENDPOINT, permissionIds);
    }

    public has(permissionIdentifier: Identifier): boolean {
        return this.permissions.has(permissionIdentifier);
    }
}

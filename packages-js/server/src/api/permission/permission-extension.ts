import { type Identifier, PermissionDenied } from '@omujs/omu';
import {
    PERMISSION_GRANT_PACKET,
    PERMISSION_REGISTER_PACKET,
    PERMISSION_REQUEST_ENDPOINT,
    PERMISSION_REQUIRE_PACKET,
    type PermissionType,
} from '@omujs/omu/api/permission';

import type { PermissionManager } from '../../security';
import { type PacketDispatcher, type Session, TaskPriority } from '../../session';
import type { DashboardExtension } from '../dashboard';
import type { EndpointExtension } from '../endpoint';

export class PermissionExtension {
    public constructor(
        dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        private readonly security: PermissionManager,
        private readonly dashboard: DashboardExtension,
    ) {
        dispatcher.register(PERMISSION_REGISTER_PACKET, PERMISSION_REQUIRE_PACKET, PERMISSION_GRANT_PACKET);
        dispatcher.bind(PERMISSION_REGISTER_PACKET, (session, permissions) => this.handleRegister(session, permissions));
        dispatcher.bind(PERMISSION_REQUIRE_PACKET, (session, ids) => this.handleRequire(session, ids));
        endpoints.bind(PERMISSION_REQUEST_ENDPOINT, () => undefined);
    }

    private handleRegister(session: Session, permissions: PermissionType[]): void {
        for (const permission of permissions) {
            if (!permission.id.isSubpathOf(session.app.id)) {
                throw new Error(`Permission identifier ${permission.id.key()} is not a subpart of app identifier ${session.app.id.key()}`);
            }
        }
        this.security.registerPermission(...permissions);
    }

    private handleRequire(session: Session, ids: Identifier[]): void {
        if (session.ready) throw new Error('Session is already ready');
        session.addTask({
            name: 'permission_require',
            detail: `Requiring permissions: ${ids.map((id) => id.key()).join(', ')}`,
            priority: TaskPriority.AFTER_SESSION,
            run: () => this.require(session, ids),
        });
    }

    private async require(session: Session, ids: Identifier[]): Promise<void> {
        const missing = ids.filter((id) => !this.security.permissions.has(id));
        if (missing.length > 0) {
            throw new PermissionDenied(`Requested permissions do not exist: ${missing.map((id) => id.key()).join(', ')}`);
        }
        const permissions = ids.map((id) => this.security.permissions.get(id)).filter((permission) => permission !== undefined);
        if (session.permissions.hasAll(ids)) {
            await session.send(PERMISSION_GRANT_PACKET, permissions);
            return;
        }
        if (!session.role.canRequest) throw new PermissionDenied('Remote apps cannot request permissions');
        const accepted = await this.dashboard.requestPermissions(session.app, permissions);
        if (!accepted) throw new PermissionDenied('Permission request denied');
        session.permissions.grantAll(ids);
        if (session.closed) return;
        await session.send(PERMISSION_GRANT_PACKET, permissions);
    }
}

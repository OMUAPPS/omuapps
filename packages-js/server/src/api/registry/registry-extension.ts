import { type Identifier, PermissionDenied } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';
import {
    REGISTRY_GET_ENDPOINT,
    REGISTRY_LISTEN_PACKET,
    REGISTRY_PERMISSION_ID,
    REGISTRY_REGISTER_PACKET,
    REGISTRY_UPDATE_PACKET,
    type RegisterPacket,
    RegistryPacket,
    type RegistryType,
} from '@omujs/omu/api/registry';

import type { PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';
import { RegistryStore, type StorageRoot } from '../../storage';
import type { EndpointExtension } from '../endpoint';

import { type ResolvedRegistryPermissions, ServerRegistry, TypedRegistry } from './server-registry.js';

type Scope = (permissions: ResolvedRegistryPermissions) => (Identifier | undefined)[];

export class RegistryExtension {
    private static readonly PERMISSION = new PermissionType({
        id: REGISTRY_PERMISSION_ID,
        metadata: {
            level: 'low',
            name: { ja: 'データを保持', en: 'Application Data' },
            note: { ja: 'アプリがデータを保持するために使われます', en: 'Used to store data for the app' },
        },
    });

    private readonly registries = new Map<string, ServerRegistry>();

    public constructor(
        dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        security: PermissionManager,
        private readonly storage: StorageRoot,
    ) {
        security.registerPermission(RegistryExtension.PERMISSION);
        dispatcher.register(REGISTRY_REGISTER_PACKET, REGISTRY_LISTEN_PACKET, REGISTRY_UPDATE_PACKET);
        dispatcher.bind(REGISTRY_REGISTER_PACKET, (session, packet) => this.handleRegister(session, packet));
        dispatcher.bind(REGISTRY_LISTEN_PACKET, (session, id) => this.handleListen(session, id));
        dispatcher.bind(REGISTRY_UPDATE_PACKET, (session, packet) => this.handleUpdate(session, packet));
        endpoints.bind(REGISTRY_GET_ENDPOINT, async (session, id) => {
            await session.waitReady();
            const registry = this.verified(session, id, (p) => [p.all, p.read]);
            return new RegistryPacket(id, registry.value ?? null);
        });
    }

    public register<T>(type: RegistryType<T>): TypedRegistry<T> {
        return new TypedRegistry(this.registry(type.id, type), type);
    }

    public async flush(): Promise<void> {
        await Promise.all([...this.registries.values()].map((registry) => registry.flush()));
    }

    private registry(id: Identifier, type?: RegistryType<unknown>): ServerRegistry {
        const existing = this.registries.get(id.key());
        if (existing) return existing;
        const registry = new ServerRegistry(id, new RegistryStore(this.storage.file('registry', id)), type?.permissions ?? {});
        this.registries.set(id.key(), registry);
        return registry;
    }

    private handleRegister(session: Session, packet: RegisterPacket): void {
        if (!packet.id.isSubpathOf(session.app.id)) {
            throw new PermissionDenied(`App ${session.app.id.key()} not allowed to register ${packet.id.key()}`);
        }
        this.registry(packet.id).setPermissions(packet.permissions);
    }

    private async handleListen(session: Session, id: Identifier): Promise<void> {
        await session.waitReady();
        await this.verified(session, id, (p) => [p.all, p.read]).attachSession(session);
    }

    private async handleUpdate(session: Session, packet: RegistryPacket): Promise<void> {
        await session.waitReady();
        const registry = this.verified(session, packet.id, (p) => [p.all, p.write]);
        registry.write(packet.value ?? undefined);
        await registry.notify(session);
    }

    private verified(session: Session, id: Identifier, scope: Scope): ServerRegistry {
        const registry = this.registry(id);
        if (session.isAppId(registry.id)) return registry;
        const permissions = scope(registry.permissions).filter((permission) => permission !== undefined);
        if (!session.permissions.hasAny(permissions)) {
            throw new PermissionDenied(`App ${session.app.id.key()} not allowed to access ${registry.id.key()}`);
        }
        return registry;
    }
}

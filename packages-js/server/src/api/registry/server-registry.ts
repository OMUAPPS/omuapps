import { Identifier, type IntoId } from '@omujs/omu';
import { REGISTRY_UPDATE_PACKET, RegistryPacket, type RegistryPermissions, type RegistryType } from '@omujs/omu/api/registry';
import type { Unlisten } from '@omujs/omu/event';

import type { Session } from '../../session';
import type { RegistryPermissionsFileJSON, RegistryStore } from '../../storage';

export type ResolvedRegistryPermissions = {
    all?: Identifier;
    read?: Identifier;
    write?: Identifier;
};

export class ServerRegistry {
    public permissions: ResolvedRegistryPermissions;
    public value: Uint8Array | undefined;
    private readonly listeners = new Map<string, { session: Session; unlisten: Unlisten }>();
    private saving: Promise<void> | undefined;
    private changed = false;

    public constructor(
        public readonly id: Identifier,
        private readonly store: RegistryStore,
        permissions: RegistryPermissions,
    ) {
        this.permissions = ServerRegistry.resolve(permissions);
        this.value = store.readValue();
        const meta = store.readMeta();
        if (meta) {
            this.permissions = ServerRegistry.fromFile(meta.permissions);
        }
    }

    public setPermissions(permissions: RegistryPermissions): void {
        this.permissions = ServerRegistry.resolve(permissions);
        this.store.writeMeta({
            permissions: {
                all: this.permissions.all?.key() ?? null,
                read: this.permissions.read?.key() ?? null,
                write: this.permissions.write?.key() ?? null,
            },
        });
    }

    public write(value: Uint8Array | undefined): void {
        this.value = value;
        this.changed = true;
        this.saving ??= this.save();
    }

    public async flush(): Promise<void> {
        await this.saving;
    }

    public async notify(except: Session | undefined): Promise<void> {
        const packet = new RegistryPacket(this.id, this.value ?? null);
        await Promise.all([...this.listeners.values()]
            .filter(({ session }) => session !== except && !session.closed)
            .map(({ session }) => session.send(REGISTRY_UPDATE_PACKET, packet)));
    }

    public async attachSession(session: Session): Promise<void> {
        const key = session.app.id.key();
        const existing = this.listeners.get(key);
        if (existing) {
            console.warn(`Session ${key} already attached to registry ${this.id.key()}`);
            existing.unlisten();
        }
        const unlisten = session.disconnected.listen(() => this.detachSession(session));
        this.listeners.set(key, { session, unlisten });
        await session.send(REGISTRY_UPDATE_PACKET, new RegistryPacket(this.id, this.value ?? null));
    }

    private detachSession(session: Session): void {
        const key = session.app.id.key();
        const listener = this.listeners.get(key);
        if (!listener || listener.session !== session) return;
        listener.unlisten();
        this.listeners.delete(key);
    }

    private async save(): Promise<void> {
        while (this.changed) {
            this.changed = false;
            this.store.writeValue(this.value);
            await Bun.sleep(1000);
        }
        this.saving = undefined;
    }

    private static resolve(permissions: RegistryPermissions): ResolvedRegistryPermissions {
        return {
            all: ServerRegistry.identifier(permissions.all),
            read: ServerRegistry.identifier(permissions.read),
            write: ServerRegistry.identifier(permissions.write),
        };
    }

    private static fromFile(permissions: RegistryPermissionsFileJSON): ResolvedRegistryPermissions {
        return ServerRegistry.resolve({
            all: permissions.all ?? undefined,
            read: permissions.read ?? undefined,
            write: permissions.write ?? undefined,
        });
    }

    private static identifier(id: IntoId | undefined): Identifier | undefined {
        if (!id) return;
        return Identifier.from(id);
    }
}

export class TypedRegistry<T> {
    public constructor(
        private readonly registry: ServerRegistry,
        private readonly type: RegistryType<T>,
    ) {}

    public get(): T {
        if (!this.registry.value) return this.type.defaultValue;
        return this.type.serializer.deserialize(this.registry.value);
    }

    public async set(value: T): Promise<void> {
        this.registry.write(this.type.serializer.serialize(value));
        await this.registry.notify(undefined);
    }
}

import type { App } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';
import {
    type AppIndex,
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_APPS_WRITE_PERMISSION_ID,
    SERVER_INDEX_READ_PERMISSION_ID,
    SERVER_INDEX_REGISTRY_TYPE,
    SERVER_SHUTDOWN_PERMISSION_ID,
    SHUTDOWN_ENDPOINT_TYPE,
    TRUSTED_HOSTS_REGISTRY_TYPE,
    TRUSTED_ORIGINS_GET_PERMISSION_ID,
} from '@omujs/omu/api/server';
import { DisconnectType } from '@omujs/omu/network';

import type { PermissionManager, TrustedHostSource, TrustedHosts } from '../../security';
import type { EndpointExtension } from '../endpoint';
import type { RegistryExtension, TypedRegistry } from '../registry';
import type { SessionExtension } from '../session';
import type { TypedTable } from '../table';

export interface ServerLifecycle {
    shutdown(restart: boolean): Promise<void>;
}

export class ServerExtension implements TrustedHostSource {
    private static readonly PERMISSIONS = [
        new PermissionType({
            id: SERVER_SHUTDOWN_PERMISSION_ID,
            metadata: {
                level: 'medium',
                name: { ja: 'サーバーをシャットダウン', en: 'Shutdown Server' },
                note: { ja: 'アプリが内部のAPIサーバーをシャットダウンするために使われます', en: 'Used by apps to shut down the internal API server' },
            },
        }),
        new PermissionType({
            id: SERVER_INDEX_READ_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'アプリ提供元を取得', en: 'Get Running Apps' },
                note: { ja: 'おむアプリの提供元を取得するために使われます', en: 'Used to get a list of omu-apps app index' },
            },
        }),
        new PermissionType({
            id: SERVER_APPS_READ_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'アプリ一覧を取得', en: 'Get Running Apps' },
                note: { ja: 'すべてのおむアプリ一覧を取得するために使われます', en: 'Used to get a list of omu-apps connected to the server' },
            },
        }),
        new PermissionType({
            id: SERVER_APPS_WRITE_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: 'アプリを管理', en: 'Manage' },
                note: { ja: 'インストールされているおむアプリを管理します', en: 'Used to manage list of omu-apps installed to the server' },
            },
        }),
        new PermissionType({
            id: TRUSTED_ORIGINS_GET_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: '信頼されたオリジンを取得', en: 'Get Trusted Origins' },
                note: { ja: '認証を通過するオリジンを取得するために使われます', en: 'Used to get origins that pass authentication' },
            },
        }),
    ];

    public readonly index: TypedRegistry<AppIndex>;
    private readonly trustedHosts: TypedRegistry<Record<string, string>>;

    public constructor(
        endpoints: EndpointExtension,
        registries: RegistryExtension,
        private readonly security: PermissionManager,
        private readonly sessions: SessionExtension,
        private readonly apps: TypedTable<App>,
        hosts: TrustedHosts,
        lifecycle: ServerLifecycle,
    ) {
        security.registerPermission(...ServerExtension.PERMISSIONS);
        endpoints.bind(SHUTDOWN_ENDPOINT_TYPE, async (_, restart) => {
            await lifecycle.shutdown(restart);
            return true;
        });
        this.index = registries.register(SERVER_INDEX_REGISTRY_TYPE);
        this.trustedHosts = registries.register(TRUSTED_HOSTS_REGISTRY_TYPE);
        hosts.setSource(this);
        apps.events.remove.listen((removed) => this.handleRemove(removed));
        apps.events.add.listen(() => this.cleanup());
    }

    public hosts(): Record<string, string> {
        return this.trustedHosts.get();
    }

    private async handleRemove(removed: Map<string, App>): Promise<void> {
        for (const app of removed.values()) {
            this.security.removeApp(app.id);
            await this.sessions.find(app.id)?.disconnect(DisconnectType.APP_REMOVED, `App ${app.id.key()} removed`);
        }
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        const apps = this.apps.fetchAll();
        const unusedServices = new Map([...apps].filter(([, app]) => app.type === 'service'));
        for (const app of apps.values()) {
            for (const dependency of Object.keys(app.dependencies)) {
                unusedServices.delete(dependency);
            }
        }
        const orphans = [...apps.values()].filter((app) => app.parentId && !apps.has(app.parentId.key()));
        const removed = [...orphans, ...unusedServices.values()];
        if (removed.length === 0) return;
        for (const app of removed) {
            this.security.removeApp(app.id);
        }
        await this.apps.remove(...removed);
    }
}

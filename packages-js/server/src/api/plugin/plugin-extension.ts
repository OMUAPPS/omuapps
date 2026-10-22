import { type App, type Omu, VERSION } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';
import {
    PLUGIN_ALLOWED_PACKAGE_TABLE,
    PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
    PLUGIN_READ_PACKAGE_PERMISSION_ID,
    PLUGIN_RELOAD_ENDPOINT_TYPE,
    PLUGIN_REQUIRE_PACKET,
} from '@omujs/omu/api/plugin';
import { DisconnectType } from '@omujs/omu/network';

import type { PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';
import type { EndpointExtension } from '../endpoint';
import type { TableExtension } from '../table';

import { VersionSpecifier } from './version-specifier.js';

export type ServerAddress = {
    host: string;
    port: number;
    hash: string | undefined;
};

export interface ServerPluginContext {
    readonly endpoints: EndpointExtension;
    readonly security: PermissionManager;
    readonly address: ServerAddress;
    readonly root: string;
    readonly dashboardPath: string | undefined;
    createClient(app: App): Omu;
}

export interface ServerPlugin {
    readonly packageName: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    uninstall(): Promise<void>;
}

export class PluginExtension {
    private static readonly PERMISSIONS = [
        new PermissionType({
            id: PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: 'プラグインを管理', en: 'Manage packages' },
                note: { ja: '任意のプラグインの追加や更新、再読み込みを行う', en: 'Add, update, or reload any plugin' },
            },
        }),
        new PermissionType({
            id: PLUGIN_READ_PACKAGE_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'プラグインを取得', en: 'Read packages' },
                note: { ja: 'インストールされているプラグインに関する情報を取得', en: 'Get information about installed plugins' },
            },
        }),
    ];

    private readonly plugins = new Map<string, ServerPlugin>();

    public constructor(
        dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        tables: TableExtension,
        security: PermissionManager,
    ) {
        security.registerPermission(...PluginExtension.PERMISSIONS);
        tables.register(PLUGIN_ALLOWED_PACKAGE_TABLE);
        dispatcher.register(PLUGIN_REQUIRE_PACKET);
        dispatcher.bind(PLUGIN_REQUIRE_PACKET, (session, requirements) => this.handleRequire(session, requirements));
        endpoints.bind(PLUGIN_RELOAD_ENDPOINT_TYPE, async (_, options) => {
            const filter = options.packages?.map((name) => PluginExtension.normalize(name));
            for (const [name, plugin] of this.plugins) {
                if (filter && !filter.includes(name)) continue;
                await plugin.stop();
                await plugin.start();
            }
            return { packages: {} };
        });
    }

    public register(...plugins: ServerPlugin[]): void {
        for (const plugin of plugins) {
            this.plugins.set(PluginExtension.normalize(plugin.packageName), plugin);
        }
    }

    public async start(): Promise<void> {
        for (const plugin of this.plugins.values()) {
            await PluginExtension.attempt(`starting ${plugin.packageName}`, () => plugin.start());
        }
    }

    public async stop(): Promise<void> {
        for (const plugin of this.plugins.values()) {
            await PluginExtension.attempt(`stopping ${plugin.packageName}`, () => plugin.stop());
        }
    }

    public async uninstall(): Promise<void> {
        for (const plugin of this.plugins.values()) {
            await PluginExtension.attempt(`uninstalling ${plugin.packageName}`, () => plugin.uninstall());
        }
    }

    private async handleRequire(session: Session, requirements: Record<string, string | null>): Promise<void> {
        const entries = Object.entries(requirements);
        if (entries.length === 0) return;
        for (const [name, specifier] of entries) {
            if (!this.plugins.has(PluginExtension.normalize(name))) {
                await session.disconnect(DisconnectType.INVALID_VERSION, `Required plugin versions are not installed: Package ${name} not installed`);
                return;
            }
            if (!VersionSpecifier.parse(specifier).contains(VERSION)) {
                await session.disconnect(
                    DisconnectType.INVALID_VERSION,
                    `Required plugin versions are not installed: Installed version ${VERSION} does not satisfy ${name}${specifier}`,
                );
                return;
            }
        }
        if (!session.role.canRequest) {
            await session.disconnect(DisconnectType.PERMISSION_DENIED, 'Remote applications cannot require plugins');
        }
    }

    private static normalize(name: string): string {
        return name.replace(/[-_.]+/g, '-').toLowerCase();
    }

    private static async attempt(action: string, run: () => Promise<void>): Promise<void> {
        try {
            await run();
        } catch (error) {
            console.error(`Error while ${action}`, error);
        }
    }
}

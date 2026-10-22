import { SERVER_APP_TABLE_TYPE } from '@omujs/omu/api/server';
import { DisconnectType } from '@omujs/omu/network';

import {
    AppIndexes,
    AssetExtension,
    DashboardExtension,
    EndpointExtension,
    HttpExtension,
    I18nExtension,
    LoggerExtension,
    PermissionExtension,
    PluginExtension,
    RegistryExtension,
    type ServerLifecycle,
    type ServerPlugin,
    ServerExtension,
    SessionExtension,
    SignalExtension,
    TableExtension,
} from '../api';
import { HttpServer } from '../network';
import { ConnectionVerifier, PermissionManager, TrustedHosts } from '../security';
import { PacketDispatcher, SessionAcceptor, SessionGateway } from '../session';
import { AssetStore, StorageRoot } from '../storage';

import type { ServerConfig } from './server-config.js';
import { ServerPages } from './server-pages.js';
import { ServerProcess } from './server-process.js';

export class Server implements ServerLifecycle {
    public readonly storage: StorageRoot;
    public readonly http: HttpServer;
    public readonly security: PermissionManager;
    public readonly sessions: SessionExtension;
    public readonly plugins: PluginExtension;
    private readonly dispatcher = new PacketDispatcher();
    private readonly tables: TableExtension;
    private readonly registries: RegistryExtension;
    private readonly assets: AssetStore;

    public constructor(
        public readonly config: ServerConfig,
        plugins: readonly ServerPlugin[],
    ) {
        this.storage = new StorageRoot(config.root);
        this.security = PermissionManager.load(this.storage.directory('security'), config.dashboardToken);
        const hosts = new TrustedHosts(config.trustedHosts);
        const endpoints = new EndpointExtension(this.dispatcher);
        this.tables = new TableExtension(this.dispatcher, endpoints, this.security, this.storage);
        this.registries = new RegistryExtension(this.dispatcher, endpoints, this.security, this.storage);
        const apps = this.tables.register(SERVER_APP_TABLE_TYPE);
        this.sessions = new SessionExtension(this.dispatcher, endpoints, this.tables, this.security, apps);
        this.http = new HttpServer(config.port, new SessionGateway(
            new SessionAcceptor(this.security, this.dispatcher.mapper, config.hash),
            new ConnectionVerifier(this.security, hosts),
            this.dispatcher,
            this.sessions,
        ));
        const server = new ServerExtension(endpoints, this.registries, this.security, this.sessions, apps, hosts, this);
        const indexes = new AppIndexes(hosts);
        const dashboard = new DashboardExtension(
            this.dispatcher,
            endpoints,
            this.tables,
            this.registries,
            this.security,
            this.sessions,
            apps,
            indexes,
        );
        new PermissionExtension(this.dispatcher, endpoints, this.security, dashboard);
        new SignalExtension(this.dispatcher);
        new HttpExtension(this.dispatcher, this.tables, this.security, apps, dashboard);
        this.assets = new AssetStore(this.storage.assets);
        new AssetExtension(endpoints, this.security, this.http, this.assets);
        new I18nExtension(this.security, this.registries);
        new LoggerExtension(this.dispatcher, this.security);
        this.plugins = new PluginExtension(this.dispatcher, endpoints, this.tables, this.security, plugins);
        new ServerPages(this.http, config, this.security, indexes, dashboard, server);
    }

    public async start(): Promise<void> {
        this.http.start();
        console.info(`Listening on ${this.config.host}:${this.config.port}`);
        await this.sessions.start();
        await this.plugins.start();
    }

    public async stop(): Promise<void> {
        console.info('Stopping server');
        await this.plugins.stop();
        await this.http.stop();
        await this.registries.flush();
        this.tables.close();
        this.assets.close();
    }

    public async shutdown(restart: boolean): Promise<void> {
        if (restart) {
            for (const session of this.sessions.all()) {
                await session.disconnect(DisconnectType.SERVER_RESTART, 'Server is restarting');
            }
        }
        await this.stop();
        if (restart) {
            ServerProcess.restart();
            return;
        }
        process.exit(0);
    }
}

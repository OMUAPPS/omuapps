import { ExtensionRegistry } from './api';
import { ASSET_EXTENSION_TYPE, type AssetExtension } from './api/asset/extension';
import { DASHBOARD_EXTENSION_TYPE, type DashboardExtension } from './api/dashboard/extension';
import { ENDPOINT_EXTENSION_TYPE, type EndpointExtension } from './api/endpoint/extension';
import { HTTP_EXTENSION_TYPE, HttpExtension } from './api/http/extension';
import { I18N_EXTENSION_TYPE, type I18nExtension } from './api/i18n/extension';
import { LOGGER_EXTENSION_TYPE, type LoggerExtension } from './api/logger/extension.js';
import { PERMISSION_EXTENSION_TYPE, type PermissionExtension } from './api/permission/extension';
import { PLUGIN_EXTENSION_TYPE, type PluginExtension } from './api/plugin/extension';
import { REGISTRY_EXTENSION_TYPE, type RegistryExtension } from './api/registry/extension';
import { SERVER_EXTENSION_TYPE, type ServerExtension } from './api/server/extension';
import { SESSION_EXTENSION_TYPE, SessionExtension } from './api/session';
import { SIGNAL_EXTENSION_TYPE, type SignalExtension } from './api/signal/extension';
import { TABLE_EXTENSION_TYPE, type TableExtension } from './api/table/extension';
import type { App } from './app.js';
import type { Unlisten } from './event';
import { EventEmitter } from './event';
import type { Address, Connection } from './network';
import { Network } from './network';
import { Transport } from './network/connection.js';
import { PACKET_TYPES } from './network/packet/packet-types.js';
import type { PacketType } from './network/packet/packet.js';
import { WebsocketTransport } from './network/websocket-transport';
import { BrowserTokenProvider, type TokenProvider } from './token.js';

export type ClientEvents = {
    started: EventEmitter<[]>;
    stopped: EventEmitter<[]>;
    ready: EventEmitter<[]>;
};

export class Omu {
    public ready: boolean;
    public running: boolean;
    readonly event: ClientEvents = {
        started: new EventEmitter(),
        stopped: new EventEmitter(),
        ready: new EventEmitter(),
    };
    readonly token: TokenProvider;
    readonly address: Address;
    readonly sessions: SessionExtension;
    readonly network: Network;
    readonly endpoints: EndpointExtension;
    readonly permissions: PermissionExtension;
    readonly plugins: PluginExtension;
    readonly dashboard: DashboardExtension;
    readonly extensions: ExtensionRegistry;
    readonly tables: TableExtension;
    readonly registries: RegistryExtension;
    readonly signals: SignalExtension;
    readonly assets: AssetExtension;
    readonly i18n: I18nExtension;
    readonly server: ServerExtension;
    readonly logger: LoggerExtension;
    readonly http: HttpExtension;

    constructor(
        public readonly app: App,
        options?: {
            address?: Address;
            token?: TokenProvider | string;
            transport?: Transport;
            connection?: Connection;
        },
    ) {
        this.ready = false;
        this.running = false;
        if (typeof options?.token === 'string') {
            const token = options?.token;
            this.token = {
                get: () => Promise.resolve(token),
                set: () => Promise.resolve(),
            };
        } else {
            this.token = options?.token ?? new BrowserTokenProvider('omu-token');
        }
        this.address = options?.address ?? {
            host: '127.0.0.1',
            port: 26423,
            secure: false,
        };
        this.network = new Network(
            this,
            this.address,
            this.token,
            options?.transport ?? new WebsocketTransport(this.address),
            options?.connection,
        );
        this.network.event.disconnected.listen(() => {
            this.ready = false;
        });
        this.network.addPacketHandler(PACKET_TYPES.READY, () => {
            if (this.ready) {
                throw new Error('Received READY packet when already ready');
            }
            this.ready = true;
            this.event.ready.emit();
        });
        this.extensions = new ExtensionRegistry(this);
        this.endpoints = this.extensions.register(ENDPOINT_EXTENSION_TYPE);
        this.plugins = this.extensions.register(PLUGIN_EXTENSION_TYPE);
        this.permissions = this.extensions.register(PERMISSION_EXTENSION_TYPE);
        this.tables = this.extensions.register(TABLE_EXTENSION_TYPE);
        this.sessions = this.extensions.register(SESSION_EXTENSION_TYPE);
        this.registries = this.extensions.register(REGISTRY_EXTENSION_TYPE);
        this.dashboard = this.extensions.register(DASHBOARD_EXTENSION_TYPE);
        this.signals = this.extensions.register(SIGNAL_EXTENSION_TYPE);
        this.assets = this.extensions.register(ASSET_EXTENSION_TYPE);
        this.i18n = this.extensions.register(I18N_EXTENSION_TYPE);
        this.server = this.extensions.register(SERVER_EXTENSION_TYPE);
        this.logger = this.extensions.register(LOGGER_EXTENSION_TYPE);
        this.http = this.extensions.register(HTTP_EXTENSION_TYPE);
    }

    public send<T>(packetType: PacketType<T>, data: T): void {
        this.network.send({
            type: packetType,
            data,
        });
    }

    public async start(): Promise<void> {
        if (this.running) {
            throw new Error('Client already running');
        }
        this.running = true;
        const connect = this.network.connect();
        this.event.started.emit();
        await connect;
    }

    public stop(): void {
        this.running = false;
        this.ready = false;
        this.event.stopped.emit();
    }

    public onReady(callback: () => void): Unlisten {
        if (this.ready) {
            callback();
        }
        return this.event.ready.listen(callback);
    }

    public async waitForReady(): Promise<void> {
        if (this.ready) return;
        return new Promise<void>((resolve) => {
            let unlisten = () => {};
            unlisten = this.event.ready.listen(() => {
                unlisten();
                resolve();
            });
        });
    }
}

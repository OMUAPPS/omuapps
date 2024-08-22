import type { App } from './app.js';
import type { EventEmitter, Unlisten } from './event-emitter.js';
import type { AssetExtension } from './extension/asset/index.js';
import type { DashboardExtension } from './extension/dashboard/index.js';
import type { EndpointExtension } from './extension/endpoint/index.js';
import type { I18nExtension } from './extension/i18n/index.js';
import type { ExtensionRegistry } from './extension/index.js';
import type { LoggerExtension } from './extension/logger/logger-extension.js';
import type { PermissionExtension } from './extension/permission/index.js';
import type { PluginExtension } from './extension/plugin/index.js';
import type { RegistryExtension } from './extension/registry/index.js';
import type { ServerExtension } from './extension/server/index.js';
import type { SignalExtension } from './extension/signal/index.js';
import type { TableExtension } from './extension/table/index.js';
import type { Address, Network } from './network/index.js';
import type { PacketType } from './network/packet/packet.js';
import type { TokenProvider } from './token.js';

export type ClientEvents = {
    started: EventEmitter<[]>;
    stopped: EventEmitter<[]>;
    ready: EventEmitter<[]>;
};

export interface Client {
    readonly app: App;
    ready: boolean;
    running: boolean;
    readonly event: ClientEvents;
    readonly token: TokenProvider;
    readonly address: Address;
    readonly network: Network;
    readonly endpoints: EndpointExtension;
    readonly permissions: PermissionExtension;
    readonly plugins: PluginExtension;
    readonly dashboard: DashboardExtension;
    readonly extensions: ExtensionRegistry;
    readonly tables: TableExtension;
    readonly registry: RegistryExtension;
    readonly signal: SignalExtension;
    readonly assets: AssetExtension;
    readonly i18n: I18nExtension;
    readonly server: ServerExtension;
    readonly logger: LoggerExtension;

    send<T>(packetType: PacketType<T>, data: T): void;

    start(): void;

    stop(): void;

    onReady(callback: () => void): Unlisten;
}

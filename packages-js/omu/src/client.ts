import type { ExtensionRegistry } from './api';
import type { AssetExtension } from './api/asset/extension';
import type { DashboardExtension } from './api/dashboard/extension';
import type { EndpointExtension } from './api/endpoint/extension';
import type { I18nExtension } from './api/i18n/extension';
import type { LoggerExtension } from './api/logger/extension';
import type { PermissionExtension } from './api/permission/extension';
import type { PluginExtension } from './api/plugin/extension';
import type { RegistryExtension } from './api/registry/extension';
import type { ServerExtension } from './api/server/extension';
import type { SignalExtension } from './api/signal/extension';
import type { TableExtension } from './api/table/extension';
import type { App } from './app';
import type { EventEmitter, Unlisten } from './event';
import type { Address, Network } from './network/index';
import type { PacketType } from './network/packet/packet';
import type { TokenProvider } from './token';

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
    readonly registries: RegistryExtension;
    readonly signals: SignalExtension;
    readonly assets: AssetExtension;
    readonly i18n: I18nExtension;
    readonly server: ServerExtension;
    readonly logger: LoggerExtension;

    send<T>(packetType: PacketType<T>, data: T): void;

    start(): void;

    stop(): void;

    onReady(callback: () => void): Unlisten;
}

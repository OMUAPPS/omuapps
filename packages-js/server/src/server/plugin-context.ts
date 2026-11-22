import { type App, Omu } from '@omujs/omu';

import type { EndpointExtension, ServerAddress, ServerPluginContext } from '../api';
import type { PermissionManager } from '../security';
import { type LocalConnectionHost, LocalTransport } from '../session';

import type { ServerConfig } from './server-config.js';

export class PluginContext implements ServerPluginContext {
    public constructor(
        public readonly endpoints: EndpointExtension,
        public readonly security: PermissionManager,
        private readonly config: ServerConfig,
        private readonly host: LocalConnectionHost,
    ) {}

    public get address(): ServerAddress {
        return { host: this.config.host, port: this.config.port, hash: this.config.hash };
    }

    public get root(): string {
        return this.config.root;
    }

    public get dashboardPath(): string | undefined {
        return this.config.dashboardPath;
    }

    public createClient(app: App): Omu {
        return new Omu(app, {
            address: { ...this.address, secure: false },
            token: this.security.generatePluginToken(),
            transport: new LocalTransport(this.host),
        });
    }
}

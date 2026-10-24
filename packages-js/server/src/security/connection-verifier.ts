import { type App, type DisconnectReason, Identifier, InvalidOrigin } from '@omujs/omu';

import { LocalAddress, type SocketRequest } from '../network';

import { AppRole, type ConnectionCheck } from './app-role.js';
import type { PermissionManager } from './permission-manager.js';
import type { TrustedHosts } from './trusted-hosts.js';

type Check = (app: App, request: SocketRequest) => DisconnectReason | undefined;

export class ConnectionVerifier {
    private readonly checks: Record<ConnectionCheck, Check>;

    public constructor(
        private readonly manager: PermissionManager,
        private readonly hosts: TrustedHosts,
    ) {
        this.checks = {
            'frame-token': (_, request) => this.checkFrameToken(request),
            'local-address': (app, request) => this.checkLocalAddress(app, request),
            'origin': (app, request) => this.checkOrigin(app, request),
        };
    }

    public verify(app: App, request: SocketRequest): DisconnectReason | undefined {
        for (const check of AppRole.of(app.type).connectionChecks) {
            const reason = this.checks[check](app, request);
            if (reason) return reason;
        }
        return;
    }

    private checkFrameToken(request: SocketRequest): DisconnectReason | undefined {
        const reason = this.manager.verifyFrameToken(
            request.url.searchParams.get('frame_token') ?? undefined,
            request.url.searchParams.get('url') ?? undefined,
            request.origin,
        );
        if (!reason) return;
        return new InvalidOrigin(reason);
    }

    private checkLocalAddress(app: App, request: SocketRequest): DisconnectReason | undefined {
        if (LocalAddress.isLocal(request.remoteAddress)) return;
        console.warn(`Invalid remote ip ${request.remoteAddress} for ${app.id.key()}`);
        return new InvalidOrigin('Invalid remote ip (see logs)');
    }

    private checkOrigin(app: App, request: SocketRequest): DisconnectReason | undefined {
        if (!request.origin) return;
        const namespace = Identifier.namespaceFromUrl(this.hosts.mapUrl(request.origin));
        if (namespace === app.id.namespace) return;
        return new InvalidOrigin(`Invalid origin: ${namespace} != ${app.id.namespace}`);
    }
}

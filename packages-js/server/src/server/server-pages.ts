import { VERSION } from '@omujs/omu';

import type { AppIndexes, DashboardExtension, ServerExtension } from '../api';
import { type HttpServer, LocalAddress } from '../network';
import type { PermissionManager } from '../security';

import FRAME_PAGE from './pages/frame.html' with { type: 'text' };
import INDEX_INSTALL_PAGE from './pages/index-install.html' with { type: 'text' };
import INDEX_PAGE from './pages/index.html' with { type: 'text' };
import type { ServerConfig } from './server-config.js';

type InstallRequest = {
    index: string;
    id: string;
};

export class ServerPages {
    private static readonly FRAME_TYPE_KEY = 'omuapps-frame';
    private static readonly INSTALL_INTERVAL_MS = 5000;

    private readonly lastPrompts = new Map<string, number>();

    public constructor(
        http: HttpServer,
        private readonly config: ServerConfig,
        private readonly security: PermissionManager,
        private readonly indexes: AppIndexes,
        private readonly dashboard: DashboardExtension,
        private readonly server: ServerExtension,
    ) {
        http.get('/', () => ServerPages.html(String(INDEX_PAGE)));
        http.get('/version', () => Response.json({ version: VERSION }));
        http.get('/frame', (request) => this.handleFrame(request));
        http.get('/index/install', (request, remote) => this.handleIndexInstallPage(request, remote));
        http.post('/api/index/install', (request, remote) => this.handleIndexInstall(request, remote));
    }

    private handleFrame(request: Request): Response {
        const raw = new URL(request.url).searchParams.get('url');
        if (!raw) return new Response(null, { status: 400 });
        const url = new URL(raw).toString();
        const frameToken = this.security.generateFrameToken(url);
        const ws = new URL(`ws://${this.config.host}:${this.config.port}/ws`);
        ws.searchParams.set('frame_token', frameToken);
        ws.searchParams.set('url', url);
        return ServerPages.html(ServerPages.fill(String(FRAME_PAGE), {
            frame_token: frameToken,
            url,
            ws_url: ws.toString(),
            type_key: ServerPages.FRAME_TYPE_KEY,
        }));
    }

    private async handleIndexInstallPage(request: Request, remote: string): Promise<Response> {
        if (!LocalAddress.isLocal(remote)) return ServerPages.error(`Invalid Host: ${remote} is not a local IP`);
        const raw = new URL(request.url).searchParams.get('index_url');
        if (!raw) return ServerPages.error('inedx_url not provided');
        const index = await this.indexes.fetch(raw).catch((error) => error as Error);
        if (index instanceof Error) return ServerPages.error(`Failed to fetch index: ${index.message}`);
        const namespace = this.indexes.mappedNamespace(raw);
        if (index.id.namespace !== namespace) return ServerPages.error(`Namespace mismatch: ${index.id.namespace} != ${namespace}`);
        const installed = index.id.key() in this.server.index.get().indexes;
        return ServerPages.html(ServerPages.fill(String(INDEX_INSTALL_PAGE), {
            id: index.id.key(),
            meta: index.meta,
            url: raw,
            ...(installed ? { installed: true } : {}),
        }));
    }

    private async handleIndexInstall(request: Request, remote: string): Promise<Response> {
        const origin = request.headers.get('Origin');
        if (!origin) return ServerPages.error('Missing Origin header');
        const originUrl = new URL(origin);
        if (!LocalAddress.isLocal(originUrl.hostname) && originUrl.hostname !== this.config.host) return ServerPages.error('Invalid Origin Host');
        if (Number(originUrl.port) !== this.config.port) return ServerPages.error('Invalid Origin Port');
        if (!LocalAddress.isLocal(remote)) return ServerPages.error(`Invalid Host: ${remote} is not a local IP`);
        const install: InstallRequest = await request.json();
        const key = install.id.split(':')[0];
        const remaining = ServerPages.INSTALL_INTERVAL_MS - (Date.now() - (this.lastPrompts.get(key) ?? 0));
        if (remaining > 0) {
            return ServerPages.error(`An installation is already in progress. You can try again in ${(remaining / 1000).toFixed(1)} seconds.`);
        }
        this.lastPrompts.set(key, Date.now());
        const index = await this.indexes.fetch(install.index).catch((error) => error as Error);
        if (index instanceof Error) return ServerPages.error(`Failed to fetch index: ${index.message}`);
        const namespace = this.indexes.mappedNamespace(install.index);
        if (index.id.namespace !== namespace) return ServerPages.error(`Namespace mismatch: ${index.id.namespace} != ${namespace}`);
        const accepted = await this.dashboard.requestIndexInstall(this.indexes.mappedUrl(install.index), index.meta);
        if (!accepted) return ServerPages.error('Installation denied by the user.', 403);
        const appIndex = this.server.index.get();
        appIndex.indexes[index.id.key()] = {
            added_at: new Date().toISOString(),
            meta: index.meta,
            url: install.index,
        };
        await this.server.index.set(appIndex);
        return Response.json({ type: 'installed' });
    }

    private static fill(page: string, config: object): string {
        return page.replace('%CONFIG%', JSON.stringify(config));
    }

    private static html(content: string): Response {
        return new Response(content, { headers: { 'Content-Type': 'text/html' } });
    }

    private static error(message: string, status = 400): Response {
        return Response.json({ type: 'error', message }, { status });
    }
}

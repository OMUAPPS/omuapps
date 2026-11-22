import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';

import { Identifier, PermissionDenied } from '@omujs/omu';
import {
    type Asset,
    ASSET_DELETE_ENDPOINT,
    ASSET_DOWNLOAD_ENDPOINT,
    ASSET_DOWNLOAD_MANY_ENDPOINT,
    ASSET_GENERATE_TOKEN_ENDPOINT,
    ASSET_PERMISSION_ID,
    ASSET_UPLOAD_ENDPOINT,
    ASSET_UPLOAD_MANY_ENDPOINT,
} from '@omujs/omu/api/asset';
import { PermissionType } from '@omujs/omu/api/permission';

import { type HttpServer, IpAddress, UserAgent } from '../../network';
import type { PermissionManager } from '../../security';
import type { Session } from '../../session';
import type { AssetStore } from '../../storage';
import type { EndpointExtension } from '../endpoint';

export class AssetExtension {
    private static readonly PERMISSION = new PermissionType({
        id: ASSET_PERMISSION_ID,
        metadata: {
            level: 'low',
            name: { ja: 'ファイルを保持', en: 'Save a file' },
            note: { ja: 'アプリがファイルを保持するために使われます', en: 'Used by apps to store files' },
        },
    });

    private readonly sessionTokens = new Map<string, string>();
    private readonly tokens = new Set<string>();

    public constructor(
        endpoints: EndpointExtension,
        security: PermissionManager,
        http: HttpServer,
        private readonly store: AssetStore,
    ) {
        security.registerPermission(AssetExtension.PERMISSION);
        endpoints.bind(ASSET_GENERATE_TOKEN_ENDPOINT, (session) => ({ token: this.generateToken(session) }));
        endpoints.bind(ASSET_UPLOAD_ENDPOINT, (session, asset) => this.upload(session, asset));
        endpoints.bind(ASSET_UPLOAD_MANY_ENDPOINT, (session, assets) => assets.map((asset) => this.upload(session, asset)));
        endpoints.bind(ASSET_DOWNLOAD_ENDPOINT, (session, id) => this.download(session, id));
        endpoints.bind(ASSET_DOWNLOAD_MANY_ENDPOINT, (session, ids) => ids.map((id) => this.download(session, id)));
        endpoints.bind(ASSET_DELETE_ENDPOINT, (session, id) => {
            AssetExtension.verify(session, id);
            if (!this.store.delete(id)) throw new Error(`Asset ${id.key()} not found`);
            return null;
        });
        http.get('/asset', (request) => this.handleAsset(request));
        http.get('/proxy', (request) => this.handleProxy(request));
    }

    private generateToken(session: Session): string {
        const existing = this.sessionTokens.get(session.app.id.key());
        if (existing) return existing;
        const token = randomBytes(32).toString('base64url');
        this.sessionTokens.set(session.app.id.key(), token);
        this.tokens.add(token);
        return token;
    }

    private upload(session: Session, asset: Asset): Identifier {
        AssetExtension.verify(session, asset.id);
        this.store.write(asset.id, asset.buffer);
        return asset.id;
    }

    private download(session: Session, id: Identifier): Asset {
        AssetExtension.verify(session, id);
        const buffer = this.store.read(id);
        if (!buffer) throw new Error(`Asset ${id.key()} not found`);
        return { id, buffer };
    }

    private handleAsset(request: Request): Response {
        const url = new URL(request.url);
        this.verifyToken(url);
        const id = url.searchParams.get('id');
        if (!id) return new Response(null, { status: 400 });
        const file = this.store.file(Identifier.fromKey(id));
        if (!existsSync(file)) return new Response(null, { status: 404 });
        return new Response(Bun.file(file));
    }

    private async handleProxy(request: Request): Promise<Response> {
        const requestUrl = new URL(request.url);
        this.verifyToken(requestUrl);
        const target = requestUrl.searchParams.get('url');
        if (!target) return new Response(null, { status: 400 });
        const url = new URL(target);
        if (!url.hostname) throw new Error('Invalid url: host is not specified');
        if (IpAddress.isPrivate(await IpAddress.resolve(url.hostname))) return new Response(null, { status: 403 });
        const noCache = Boolean(requestUrl.searchParams.get('no_cache'));
        const cors = {
            'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        try {
            const response = await fetch(url, { headers: UserAgent.headers(), signal: AbortSignal.timeout(10_000) });
            return new Response(response.body, {
                status: response.status,
                headers: {
                    'Cache-Control': noCache ? 'no-cache' : 'max-age=3600',
                    'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
                    ...cors,
                },
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'TimeoutError') {
                return new Response(null, { status: 504, headers: cors });
            }
            console.error('Failed to proxy request', error);
            return new Response(null, { status: 502, headers: cors });
        }
    }

    private verifyToken(url: URL): void {
        const token = url.searchParams.get('asset_token');
        if (!token) throw new Error('asset_token is not set');
        if (!this.tokens.has(token)) throw new Error('Invalid asset_token was passed');
    }

    private static verify(session: Session, id: Identifier): void {
        if (session.isAppId(id)) return;
        throw new PermissionDenied(`App ${session.app.id.key()} not allowed to ${id.key()}`);
    }
}

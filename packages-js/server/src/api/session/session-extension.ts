import { App, Identifier } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';
import {
    GENERATE_TOKEN_ENDPOINT_TYPE,
    GENERATE_TOKEN_PERMISSION_ID,
    type GenerateTokenPayload,
    type GenerateTokenResponse,
    REMOTE_APP_REQUEST_ENDPOINT_TYPE,
    REMOTE_APP_REQUEST_PERMISSION_ID,
    type RemoteAppRequestPayload,
    type RequestRemoteAppResponse,
    SESSION_CONNECTED_PACKET_TYPE,
    SESSION_DISCONNECTED_PACKET_TYPE,
    SESSION_OBSERVE_PACKET_TYPE,
    SESSION_REQUIRE_PACKET_TYPE,
    SESSION_TABLE_TYPE,
    SESSIONS_READ_PERMISSION_ID,
} from '@omujs/omu/api/session';
import { DisconnectType } from '@omujs/omu/network';

import { LocalAddress } from '../../network';
import type { PermissionManager } from '../../security';
import { type PacketDispatcher, type Session, type SessionHost, TaskPriority } from '../../session';
import type { EndpointExtension } from '../endpoint';
import type { TableExtension, TypedTable } from '../table';

type TokenRequest = {
    app: App;
    permissions: Identifier[];
};

export class SessionExtension implements SessionHost {
    private static readonly PERMISSIONS = [
        new PermissionType({
            id: SESSIONS_READ_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: '接続中のアプリを取得', en: 'Get Running Apps' },
                note: { ja: 'どのアプリが接続されているかを確認するために使われます', en: 'Used to get a list of apps connected to the server' },
            },
        }),
        new PermissionType({
            id: REMOTE_APP_REQUEST_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: '遠隔アプリを要求', en: 'Request Remote App' },
                note: { ja: 'ネットワークを経由して操作を可能にするために使われます', en: 'Used to enable control over the network' },
            },
        }),
        new PermissionType({
            id: GENERATE_TOKEN_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: '認証トークンを生成', en: 'Generate Auth Token' },
                note: { ja: 'OBSにアプリを追加したり、複数画面でアプリを起動するために使われます', en: 'Used to add apps to OBS or launch apps on multiple screens' },
            },
        }),
    ];

    private readonly sessions = new Map<string, Session>();
    private readonly sessionTable: TypedTable<App>;
    private readonly waiters = new Map<string, Array<() => void>>();
    private readonly observers = new Map<string, Set<Session>>();

    public constructor(
        private readonly dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        tables: TableExtension,
        private readonly security: PermissionManager,
        private readonly apps: TypedTable<App>,
    ) {
        security.registerPermission(...SessionExtension.PERMISSIONS);
        this.sessionTable = tables.register(SESSION_TABLE_TYPE);
        dispatcher.register(SESSION_REQUIRE_PACKET_TYPE, SESSION_OBSERVE_PACKET_TYPE, SESSION_CONNECTED_PACKET_TYPE, SESSION_DISCONNECTED_PACKET_TYPE);
        dispatcher.bind(SESSION_REQUIRE_PACKET_TYPE, (session, ids) => this.handleRequire(session, ids));
        dispatcher.bind(SESSION_OBSERVE_PACKET_TYPE, (session, ids) => this.handleObserve(session, ids));
        endpoints.bind(GENERATE_TOKEN_ENDPOINT_TYPE, (session, request) => this.handleGenerateToken(session, request));
        endpoints.bind(REMOTE_APP_REQUEST_ENDPOINT_TYPE, (session, request) => this.handleRemoteAppRequest(session, request));
    }

    public async start(): Promise<void> {
        await this.sessionTable.clear();
    }

    public find(id: Identifier): Session | undefined {
        return this.sessions.get(id.key());
    }

    public all(): Session[] {
        return [...this.sessions.values()];
    }

    public async host(session: Session): Promise<void> {
        console.info(`Connected: ${session.app.id.key()}`);
        const existing = this.find(session.app.id);
        if (existing) {
            console.warn(`Session ${session.app.id.key()} already connected`);
            await existing.disconnect(DisconnectType.ANOTHER_CONNECTION, `Another connection from ${session.app.id.key()}`);
        }
        this.sessions.set(session.app.id.key(), session);
        session.disconnected.listen(() => this.handleDisconnected(session));
        session.readied.listen(() => this.handleReady(session));
        await this.apps.update(session.app);
        await this.sessionTable.add(session.app);
        await session.listen(this.dispatcher);
    }

    private handleRequire(session: Session, ids: Identifier[]): void {
        if (ids.length === 0) return;
        session.addTask({
            name: 'session_require',
            detail: `Requiring sessions: ${ids.map((id) => id.key()).join(', ')}`,
            priority: TaskPriority.AFTER_PLUGIN,
            run: async () => {
                await Promise.all(ids.map((id) => this.waitFor(id)));
            },
        });
    }

    private handleObserve(session: Session, ids: Identifier[]): void {
        session.permissions.require(SESSIONS_READ_PERMISSION_ID, `Permission ${SESSIONS_READ_PERMISSION_ID.key()} required to observe session`);
        for (const id of ids) {
            const observers = this.observers.get(id.key()) ?? new Set();
            observers.add(session);
            this.observers.set(id.key(), observers);
        }
        session.disconnected.listen(() => {
            for (const id of ids) {
                this.observers.get(id.key())?.delete(session);
            }
        });
    }

    private handleGenerateToken(session: Session, payload: GenerateTokenPayload): GenerateTokenResponse {
        const request = SessionExtension.request(payload);
        const error = this.verifyTokenRequest(session, request);
        if (error) return { type: 'error', message: error };
        const { handle, token } = this.security.generateAppToken(request.app);
        handle.grantAll(request.permissions);
        return { type: 'success', token };
    }

    private handleRemoteAppRequest(session: Session, payload: RemoteAppRequestPayload): RequestRemoteAppResponse {
        const request = SessionExtension.request(payload);
        if (!session.role.managesDashboard && !request.app.url) {
            return { type: 'error', message: 'Requested app must have a URL' };
        }
        const error = this.verifyTokenRequest(session, request);
        if (error) return { type: 'error', message: error };
        const { handle, token } = this.security.generateAppToken(request.app);
        handle.grantAll(request.permissions);
        return { type: 'success', token, lan_ip: LocalAddress.lan() };
    }

    private verifyTokenRequest(session: Session, request: TokenRequest): string | undefined {
        if (session.app.parentId) return 'Only parent apps can generate tokens';
        if (!session.role.managesDashboard) {
            if (!request.app.id.isSubpathOf(session.app.id)) return 'You can only generate tokens for sibling apps';
            if (!request.app.parentId) return 'You can only generate tokens for child apps';
            if (!request.app.parentId.isEqual(session.app.id)) return 'You can only generate tokens for your own child apps';
        }
        const missing = request.permissions.filter((id) => !session.permissions.has(id));
        if (missing.length > 0) {
            return `You don't have permission to grant some of the requested permissions ${missing.map((id) => id.key()).join(', ')}`;
        }
        return;
    }

    private async handleDisconnected(session: Session): Promise<void> {
        console.info(`Disconnected: ${session.app.id.key()}`);
        if (this.sessions.get(session.app.id.key()) !== session) return;
        this.sessions.delete(session.app.id.key());
        await this.sessionTable.remove(session.app);
        for (const observer of this.observers.get(session.app.id.key()) ?? []) {
            if (observer.closed) continue;
            await observer.send(SESSION_DISCONNECTED_PACKET_TYPE, session.app);
        }
    }

    private async handleReady(session: Session): Promise<void> {
        const key = session.app.id.key();
        for (const resolve of this.waiters.get(key) ?? []) {
            resolve();
        }
        this.waiters.delete(key);
        for (const observer of this.observers.get(key) ?? []) {
            if (observer.closed) continue;
            await observer.send(SESSION_CONNECTED_PACKET_TYPE, session.app);
        }
    }

    private async waitFor(id: Identifier): Promise<void> {
        const existing = this.find(id);
        if (existing) {
            await existing.waitReady();
            return;
        }
        await new Promise<void>((resolve) => {
            const waiters = this.waiters.get(id.key()) ?? [];
            waiters.push(resolve);
            this.waiters.set(id.key(), waiters);
        });
    }

    private static request(payload: GenerateTokenPayload | RemoteAppRequestPayload): TokenRequest {
        const permissions = payload.permissions ?? [];
        return {
            app: App.deserialize(payload.app),
            permissions: permissions.map((key) => Identifier.fromKey(key)),
        };
    }
}

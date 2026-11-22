import { type App, Identifier, PermissionDenied } from '@omujs/omu';
import {
    type AllowedPorts,
    DataChunk,
    HTTP_ALLOWED_PORTS,
    HTTP_REQUEST_CLOSE,
    HTTP_REQUEST_CREATE,
    HTTP_REQUEST_PERMISSION_ID,
    HTTP_REQUEST_SEND,
    HTTP_RESPONSE_CHUNK,
    HTTP_RESPONSE_CLOSE,
    HTTP_RESPONSE_CREATE,
    type HttpRequest,
    type HttpResponse,
    type RequestHandle,
    WEBSOCKET_CLOSE,
    WEBSOCKET_CREATE,
    WEBSOCKET_DATA,
    WEBSOCKET_ERROR,
    WEBSOCKET_OPEN,
    type WebSocketClose,
    type WSDataMeta,
    WSMsgType,
} from '@omujs/omu/api/http';
import { PermissionType } from '@omujs/omu/api/permission';

import { IpAddress, UserAgent } from '../../network';
import type { PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';
import type { DashboardExtension } from '../dashboard';
import type { TableExtension, TypedTable } from '../table';

class PortNotAllowed extends Error {}

class RequestBody {
    private readonly chunks: Uint8Array[] = [];
    private resolve: () => void = () => {};
    public readonly closed: Promise<void> = new Promise((resolve) => {
        this.resolve = resolve;
    });

    public constructor(public readonly session: Session) {}

    public write(chunk: Uint8Array): void {
        this.chunks.push(chunk);
    }

    public close(): void {
        this.resolve();
    }

    public bytes(): Uint8Array<ArrayBuffer> {
        return new Uint8Array(Buffer.concat(this.chunks));
    }
}

type HeaderWebSocket = new (url: URL, options: { headers: Record<string, string> }) => WebSocket;

class SocketHandle {
    public constructor(
        public readonly session: Session,
        public readonly socket: WebSocket,
        public readonly opened: Promise<void>,
    ) {}
}

export class HttpExtension {
    private static readonly PERMISSION = new PermissionType({
        id: HTTP_REQUEST_PERMISSION_ID,
        metadata: {
            level: 'low',
            name: { en: 'HTTP Requests', ja: 'HTTPリクエスト' },
            note: { ja: 'アプリが外部のサイトにアクセスすることを許可します。', en: 'Allows apps to access external sites.' },
        },
    });

    private static readonly WebSocket = WebSocket as unknown as HeaderWebSocket;

    private readonly requests = new Map<string, RequestBody>();
    private readonly sockets = new Map<string, SocketHandle>();
    private readonly allowedPorts: TypedTable<AllowedPorts>;

    public constructor(
        dispatcher: PacketDispatcher,
        tables: TableExtension,
        security: PermissionManager,
        apps: TypedTable<App>,
        private readonly dashboard: DashboardExtension,
    ) {
        security.registerPermission(HttpExtension.PERMISSION);
        dispatcher.register(
            HTTP_REQUEST_CREATE,
            HTTP_REQUEST_SEND,
            HTTP_REQUEST_CLOSE,
            WEBSOCKET_CREATE,
            WEBSOCKET_OPEN,
            WEBSOCKET_CLOSE,
            WEBSOCKET_DATA,
            WEBSOCKET_ERROR,
        );
        dispatcher.bind(HTTP_REQUEST_CREATE, (session, request) => this.handleRequestCreate(session, request));
        dispatcher.bind(HTTP_REQUEST_SEND, (session, chunk) => this.request(session, chunk.meta).write(chunk.body));
        dispatcher.bind(HTTP_REQUEST_CLOSE, (session, handle) => this.request(session, handle).close());
        dispatcher.bind(WEBSOCKET_CREATE, (session, request) => this.handleSocketCreate(session, request));
        dispatcher.bind(WEBSOCKET_DATA, (session, chunk) => this.handleSocketData(session, chunk));
        dispatcher.bind(WEBSOCKET_CLOSE, (session, close) => this.handleSocketClose(session, close));
        this.allowedPorts = tables.register(HTTP_ALLOWED_PORTS);
        apps.events.remove.listen((removed) => this.allowedPorts.table.remove([...removed.keys()]));
    }

    private async handleRequestCreate(session: Session, request: HttpRequest): Promise<void> {
        this.verifyRequest(session, request, this.requests);
        const body = new RequestBody(session);
        this.requests.set(request.id, body);
        try {
            const url = new URL(request.url);
            await this.verifyPortAllowed(session, url);
            await body.closed;
            const response = await fetch(url, {
                method: request.method,
                headers: UserAgent.headers(request.header),
                redirect: request.redirect === 'follow' ? 'follow' : 'manual',
                body: ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? undefined : body.bytes(),
            });
            await session.send(HTTP_RESPONSE_CREATE, HttpExtension.serializeResponse(request.id, response));
            const reader = response.body?.getReader();
            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                await session.send(HTTP_RESPONSE_CHUNK, new DataChunk<RequestHandle>({ id: request.id }, value));
            }
            await session.send(HTTP_RESPONSE_CLOSE, { id: request.id });
        } finally {
            this.requests.delete(request.id);
        }
    }

    private async handleSocketCreate(session: Session, request: HttpRequest): Promise<void> {
        this.verifyRequest(session, request, this.sockets);
        try {
            const url = new URL(request.url);
            await this.verifyPortAllowed(session, url);
            const socket = new HttpExtension.WebSocket(url, { headers: Object.fromEntries(UserAgent.headers(request.header)) });
            socket.binaryType = 'arraybuffer';
            const opened = new Promise<void>((resolve, reject) => {
                socket.addEventListener('open', () => resolve(), { once: true });
                socket.addEventListener('error', () => reject(new Error('ConnectionRefused')), { once: true });
            });
            this.sockets.set(request.id, new SocketHandle(session, socket, opened));
            session.disconnected.listen(() => socket.close());
            socket.addEventListener('message', (event) => this.forwardMessage(session, request.id, event));
            socket.addEventListener('close', (event) => this.forwardClose(session, request.id, event));
            await opened;
            await session.send(WEBSOCKET_OPEN, { id: request.id, protocol: socket.protocol || null, url: socket.url });
        } catch (error) {
            this.sockets.delete(request.id);
            const reason = error instanceof PortNotAllowed ? error.message : '';
            await session.send(WEBSOCKET_ERROR, { id: request.id, type: 'ConnectionRefused', reason });
        }
    }

    private async handleSocketData(session: Session, chunk: DataChunk<WSDataMeta>): Promise<void> {
        const handle = this.socket(session, chunk.meta);
        await handle.opened;
        if (chunk.meta.type === WSMsgType.TEXT) {
            handle.socket.send(new TextDecoder().decode(chunk.body));
            return;
        }
        handle.socket.send(chunk.body);
    }

    private async handleSocketClose(session: Session, close: WebSocketClose): Promise<void> {
        const handle = this.socket(session, close);
        await handle.opened;
        handle.socket.close(close.code ?? 1000, close.reason ?? '');
    }

    private async forwardMessage(session: Session, id: string, event: MessageEvent): Promise<void> {
        if (session.closed) return;
        const text = typeof event.data === 'string';
        const body = text ? new TextEncoder().encode(event.data) : new Uint8Array(event.data);
        await session.send(WEBSOCKET_DATA, new DataChunk<WSDataMeta>({ id, type: text ? WSMsgType.TEXT : WSMsgType.BINARY }, body));
    }

    private async forwardClose(session: Session, id: string, event: CloseEvent): Promise<void> {
        this.sockets.delete(id);
        if (session.closed) return;
        await session.send(WEBSOCKET_CLOSE, { id, code: event.code, reason: event.reason });
    }

    private verifyRequest(session: Session, request: HttpRequest, handles: Map<string, unknown>): void {
        session.permissions.require(HTTP_REQUEST_PERMISSION_ID, `Missing HTTP request permission: ${HTTP_REQUEST_PERMISSION_ID.key()}`);
        if (!session.isAppId(Identifier.fromKey(request.id))) {
            throw new Error(`Request id ${request.id} is not a app id of ${session.app.id.key()}`);
        }
        if (handles.has(request.id)) throw new Error(`Request id ${request.id} already existing`);
    }

    private async verifyPortAllowed(session: Session, url: URL): Promise<void> {
        if (session.role.managesDashboard) return;
        if (!url.hostname) throw new Error('Invalid url: host is not specified');
        if (IpAddress.isGlobal(await IpAddress.resolve(url.hostname))) return;
        if (!url.port) return;
        const port = Number(url.port);
        const id = session.app.id.key();
        const entry = await this.allowedPorts.get(id) ?? { id, ports: [] };
        if (entry.ports.includes(port)) return;
        if (!await this.dashboard.requestHttpPort(session.app, port)) {
            throw new PortNotAllowed(`App ${id} does not have permission to access port ${port}.`);
        }
        entry.ports.push(port);
        await this.allowedPorts.update(entry);
    }

    private request(session: Session, handle: RequestHandle): RequestBody {
        const request = this.requests.get(handle.id);
        if (!request) throw new Error(`Request handle ${handle.id} does not exist`);
        if (request.session !== session) throw new PermissionDenied('Mismatched session on request handle');
        return request;
    }

    private socket(session: Session, handle: RequestHandle): SocketHandle {
        const socket = this.sockets.get(handle.id);
        if (!socket) throw new Error(`Request handle ${handle.id} does not exist`);
        if (socket.session !== session) throw new PermissionDenied('Mismatched session on request handle');
        return socket;
    }

    private static serializeResponse(id: string, response: Response): HttpResponse {
        return {
            id,
            header: Object.fromEntries(response.headers),
            history: [],
            redirected: response.redirected,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
        };
    }
}

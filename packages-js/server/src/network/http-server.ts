import type { Server } from 'bun';

import { LocalAddress } from './local-address.js';
import { SocketChannel, type SocketData } from './socket-channel.js';
import { SocketRequest } from './socket-request.js';

export type RouteHandler = (request: Request, remoteAddress: string) => Response | Promise<Response>;

export interface SocketAcceptor {
    accept(channel: SocketChannel, request: SocketRequest): Promise<void>;
}

export class HttpServer {
    private static readonly CORS_HEADERS = {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
    };

    private readonly routes = new Map<string, RouteHandler>();
    private server: Server<SocketData> | undefined;

    public constructor(
        private readonly port: number,
        private readonly acceptor: SocketAcceptor,
    ) {}

    public get(path: string, handler: RouteHandler): void {
        this.routes.set(`GET ${path}`, handler);
    }

    public post(path: string, handler: RouteHandler): void {
        this.routes.set(`POST ${path}`, handler);
    }

    public start(): void {
        if (this.server) throw new Error('Server already started');
        this.server = Bun.serve<SocketData>({
            hostname: '0.0.0.0',
            port: this.port,
            idleTimeout: 0,
            fetch: (request, server) => this.handle(request, server),
            websocket: {
                maxPayloadLength: 1024 * 1024 * 1024,
                idleTimeout: 960,
                open: (socket) => {
                    socket.data.channel.attach(socket);
                    this.acceptor.accept(socket.data.channel, socket.data.request).catch((error) => {
                        console.error('Failed to accept connection', error);
                        socket.data.channel.close();
                    });
                },
                message: (socket, message) => {
                    socket.data.channel.push(message);
                },
                close: (socket) => {
                    socket.data.channel.end();
                },
            },
        });
    }

    public async stop(): Promise<void> {
        await this.server?.stop(true);
        this.server = undefined;
    }

    private async handle(request: Request, server: Server<SocketData>): Promise<Response | undefined> {
        const remoteAddress = LocalAddress.normalize(server.requestIP(request)?.address ?? '');
        const url = new URL(request.url);
        if (url.pathname === '/ws') {
            const upgraded = server.upgrade(request, {
                data: {
                    channel: new SocketChannel(),
                    request: SocketRequest.from(request, remoteAddress),
                },
            });
            if (upgraded) return;
            return new Response('Upgrade failed', { status: 400 });
        }
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*', ...HttpServer.CORS_HEADERS },
            });
        }
        const handler = this.routes.get(`${request.method} ${url.pathname}`);
        const response = handler ? await this.respond(handler, request, remoteAddress) : new Response(null, { status: 404 });
        return HttpServer.withCors(request, response);
    }

    private async respond(handler: RouteHandler, request: Request, remoteAddress: string): Promise<Response> {
        try {
            return await handler(request, remoteAddress);
        } catch (error) {
            console.error(`Error handling ${request.method} ${request.url}`, error);
            return new Response(null, { status: 500 });
        }
    }

    private static withCors(request: Request, response: Response): Response {
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') ?? '*');
        for (const [key, value] of Object.entries(HttpServer.CORS_HEADERS)) {
            headers.set(key, value);
        }
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }
}

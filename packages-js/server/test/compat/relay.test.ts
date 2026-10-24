import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { App, Omu, OmuPermissions } from '@omujs/omu';
import { type Connection, type Transport, WebsocketConnection } from '@omujs/omu/network';

import { TestClients } from './test-clients.js';
import { type TestServer, TypeScriptTestServer } from './test-server.js';

type HeaderWebSocket = new (url: string, options: { headers: Record<string, string> }) => WebSocket;

class FrameSocketTransport implements Transport {
    public constructor(
        private readonly server: TestServer,
        private readonly appUrl: string,
    ) {}

    public async connect(): Promise<Connection> {
        const origin = `http://127.0.0.1:${this.server.port}`;
        const page = await (await fetch(`${origin}/frame?url=${encodeURIComponent(this.appUrl)}`)).text();
        const wsUrl = /"ws_url"\s*:\s*"([^"]+)"/.exec(page)?.[1];
        if (!wsUrl) throw new Error('Frame page has no ws_url');
        const socket = new (WebSocket as unknown as HeaderWebSocket)(wsUrl, { headers: { Origin: origin } });
        return WebsocketConnection.fromSocket(socket);
    }
}

const SERVERS: (() => TestServer)[] = [
    () => new TypeScriptTestServer(),
];

for (const createServer of SERVERS) {
    const server = createServer();

    describe(`${server.name} server relays`, () => {
        const clients = new TestClients(server);

        beforeAll(async () => {
            await server.start();
        }, 180_000);

        afterAll(async () => {
            clients.stop();
            await server.stop();
        });

        test('relays a websocket through the server', async () => {
            const echo = Bun.serve({
                port: 0,
                fetch: (request, bun) => (bun.upgrade(request) ? undefined : new Response('upgrade required', { status: 400 })),
                websocket: {
                    message: (socket, message) => {
                        socket.send(`echo ${message}`);
                    },
                },
            });
            try {
                const omu = await clients.connect(TestClients.app('ws'), () => {}, [OmuPermissions.HTTP_REQUEST_PERMISSION_ID]);
                const ws = await omu.http.ws(`ws://127.0.0.1:${echo.port}/`);
                expect((await ws.receive()).type).toBe('open');
                ws.send('hello');
                const message = await ws.receive();
                expect(message).toEqual({ type: 'text', data: 'echo hello' });
                ws.close();
            } finally {
                echo.stop();
            }
        }, 30_000);

        test('refuses to proxy a private address', async () => {
            const omu = await clients.connect(TestClients.app('proxy'), (client) => {
                client.permissions.require(OmuPermissions.ASSET_PERMISSION_ID);
            }, [OmuPermissions.ASSET_PERMISSION_ID]);
            const response = await fetch(omu.assets.proxy(`http://127.0.0.1:${server.port}/version`));
            expect(response.status).toBe(403);
        }, 30_000);

        test('accepts an encrypted remote app through the frame page', async () => {
            const parentApp = TestClients.app('remote-parent');
            const parent = await clients.connect(parentApp, () => {}, [
                OmuPermissions.REMOTE_APP_REQUEST_PERMISSION_ID,
                OmuPermissions.REGISTRY_PERMISSION_ID,
                OmuPermissions.SESSIONS_READ_PERMISSION_ID,
            ]);
            const remoteApp = new App(parentApp.id.join('remote'), {
                type: 'remote',
                parentId: parentApp.id,
                url: 'https://example.com/remote',
                metadata: { locale: 'en', name: { en: 'Remote' } },
                version: '1.0.0',
            });
            const result = await parent.sessions.requestRemoteApp({ app: remoteApp, permissions: [OmuPermissions.REGISTRY_PERMISSION_ID] });
            if (result.type !== 'success') throw new Error(result.message);
            const remote = new Omu(remoteApp, {
                address: { host: '127.0.0.1', port: server.port, secure: false },
                token: result.token,
                transport: new FrameSocketTransport(server, remoteApp.url!),
            });
            try {
                await clients.start(remote);
                expect(remote.ready).toBe(true);
                expect(await parent.sessions.has(remoteApp.id)).toBe(true);
            } finally {
                remote.stop();
            }
        }, 30_000);
    });
}

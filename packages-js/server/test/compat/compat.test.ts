import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { App, Identifier, OmuPermissions } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';
import { PermissionType } from '@omujs/omu/api/permission';
import { RegistryType } from '@omujs/omu/api/registry';
import { SignalType } from '@omujs/omu/api/signal';
import { TableType } from '@omujs/omu/api/table';
import { DisconnectType } from '@omujs/omu/network';

import { TestClients } from './test-clients.js';
import { type TestServer, TypeScriptTestServer } from './test-server.js';

type Item = { id: string; value: number };

const SERVERS: (() => TestServer)[] = [
    () => new TypeScriptTestServer(),
];

for (const createServer of SERVERS) {
    const server = createServer();

    describe(`${server.name} server`, () => {
        const clients = new TestClients(server);

        beforeAll(async () => {
            await server.start();
        }, 180_000);

        afterAll(async () => {
            clients.stop();
            await server.stop();
        });

        test('serves its version', async () => {
            const response = await fetch(`http://127.0.0.1:${server.port}/version`);
            expect(await response.json()).toEqual({ version: expect.any(String) });
        });

        test('relays an HTTP request with a body', async () => {
            const echo = Bun.serve({ port: 0, fetch: async (request) => new Response(`${request.method} ${await request.text()}`) });
            try {
                const omu = await clients.connect(TestClients.app('http'), () => {}, [OmuPermissions.HTTP_REQUEST_PERMISSION_ID]);
                const response = await omu.http.fetch(`http://127.0.0.1:${echo.port}/`, { method: 'POST', body: 'hello' });
                expect(await response.text()).toBe('POST hello');
            } finally {
                echo.stop();
            }
        }, 30_000);

        test('accepts the dashboard', async () => {
            const dashboard = await clients.connectDashboard();
            expect(dashboard.ready).toBe(true);
        });

        test('rejects an app with an invalid token', async () => {
            const omu = clients.create(TestClients.app('invalid'), 'not-a-token');
            await omu.start().catch(() => undefined);
            expect(omu.network.reason?.type).toBe(DisconnectType.INVALID_TOKEN);
        });

        test('accepts an app with a generated token', async () => {
            const omu = await clients.connect(TestClients.app('connect'));
            expect(omu.ready).toBe(true);
        });

        test('stores and reads a registry value across connections', async () => {
            const app = TestClients.app('registry');
            const type = RegistryType.createJson<{ count: number }>(app, { name: 'settings', defaultValue: { count: 0 } });
            const permissions = [OmuPermissions.REGISTRY_PERMISSION_ID];
            const first = await clients.connect(app, () => {}, permissions);
            const registry = first.registries.get(type);
            await registry.set({ count: 3 });
            expect(await registry.get()).toEqual({ count: 3 });
            first.stop();
            const second = await clients.connect(app, () => {}, permissions);
            expect(await second.registries.get(type).get()).toEqual({ count: 3 });
        });

        test('adds, reads, and removes table items', async () => {
            const app = TestClients.app('table');
            const type = TableType.createJson<Item>(app, { name: 'items', key: (item) => item.id });
            const omu = await clients.connect(app);
            const table = omu.tables.get(type);
            await table.add({ id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 });
            expect(await table.size()).toBe(3);
            expect(await table.get('b')).toEqual({ id: 'b', value: 2 });
            expect(await table.has('c')).toBe(true);
            expect([...(await table.fetchAll()).keys()].sort()).toEqual(['a', 'b', 'c']);
            await table.remove({ id: 'a', value: 1 });
            expect(await table.has('a')).toBe(false);
            expect(await table.size()).toBe(2);
        });

        test('relays an endpoint call between sessions', async () => {
            const app = TestClients.app('endpoint');
            const permission = app.id.join('call');
            const type = EndpointType.createJson<{ text: string }, { echoed: string }>(app, { name: 'echo', permissionId: permission });
            await clients.connect(app, (omu) => {
                omu.endpoints.bind(type, async (request) => ({ echoed: request.text.toUpperCase() }));
            });
            const dashboard = await clients.connectDashboard();
            expect(await dashboard.endpoints.call(type, { text: 'hello' })).toEqual({ echoed: 'HELLO' });
        });

        test('delivers a signal to a listener', async () => {
            const app = TestClients.app('signal');
            const permission = app.id.join('signal');
            const type = SignalType.createJson<string>(app, { name: 'ping', permissions: { all: permission } });
            const received = Promise.withResolvers<string>();
            const listener = await clients.connect(app, (omu) => {
                omu.signals.get(type).listen((value) => received.resolve(value));
            });
            await Bun.sleep(100);
            const sender = await clients.connect(new App(app.id.join('sender'), { parentId: app.id }), () => {}, [permission]);
            await sender.signals.get(type).notify('pong');
            expect(await received.promise).toBe('pong');
            expect(listener.ready).toBe(true);
        });

        test('asks the dashboard before granting a permission', async () => {
            const owner = TestClients.app('permission');
            const permission = PermissionType.create(owner.id.join('use'), { metadata: { level: 'low', name: 'Use' } });
            await clients.connect(owner, (omu) => omu.permissions.register(permission));
            const requester = TestClients.app('requester');
            const before = clients.dashboard.prompts.length;
            const omu = await clients.connect(requester, (client) => client.permissions.require(permission.id));
            expect(omu.permissions.has(permission.id)).toBe(true);
            expect(clients.dashboard.prompts.slice(before)).toEqual(['app/permissions']);
        });

        test('uploads and downloads an asset', async () => {
            const app = TestClients.app('asset');
            const omu = await clients.connect(app, () => {}, [OmuPermissions.ASSET_PERMISSION_ID]);
            const id = app.id.join('files', 'data.bin');
            const buffer = new Uint8Array([0, 1, 2, 250, 255]);
            await omu.assets.upload(id, buffer);
            const asset = await omu.assets.download(id);
            expect(asset.buffer).toEqual(buffer);
            expect(Identifier.from(asset.id).key()).toBe(id.key());
        });
    });
}

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { App, OmuPermissions } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';
import { SESSION_TABLE_TYPE } from '@omujs/omu/api/session';
import { SignalType } from '@omujs/omu/api/signal';

import { TestClients } from './test-clients.js';
import { TypeScriptTestServer } from './test-server.js';

describe('typescript server fixes', () => {
    const server = new TypeScriptTestServer();
    const clients = new TestClients(server);

    beforeAll(async () => {
        await server.start();
    }, 60_000);

    afterAll(async () => {
        clients.stop();
        await server.stop();
    });

    test('keeps concurrent endpoint calls with the same key apart', async () => {
        const app = TestClients.app('relay');
        const permission = app.id.join('call');
        const type = EndpointType.createJson<number, number>(app, { name: 'slow', permissionId: permission });
        await clients.connect(app, (omu) => {
            omu.endpoints.bind(type, async (value) => {
                await Bun.sleep(value === 1 ? 200 : 10);
                return value * 10;
            });
        });
        const first = await clients.connect(TestClients.app('caller-a'), () => {}, [permission]);
        const second = await clients.connect(TestClients.app('caller-b'), () => {}, [permission]);
        const results = await Promise.all([first.endpoints.call(type, 1), second.endpoints.call(type, 2)]);
        expect(results).toEqual([10, 20]);
    });

    test('removes a disconnected app from the session table', async () => {
        const dashboard = await clients.connectDashboard();
        const sessions = dashboard.tables.get(SESSION_TABLE_TYPE);
        const app = TestClients.app('leaving');
        const omu = await clients.connect(app);
        expect(await sessions.has(app.id.key())).toBe(true);
        omu.stop();
        await Bun.sleep(200);
        expect(await sessions.has(app.id.key())).toBe(false);
    });

    test('honors the send permission of a signal', async () => {
        const app = TestClients.app('sender-permission');
        const send = app.id.join('send');
        const type = SignalType.createJson<string>(app, { name: 'ping', permissions: { send } });
        const received = Promise.withResolvers<string>();
        await clients.connect(app, (omu) => {
            omu.signals.get(type).listen((value) => received.resolve(value));
        });
        await Bun.sleep(100);
        const sender = await clients.connect(new App('com.example:other-sender', { version: '1.0.0' }), () => {}, [send]);
        await sender.signals.get(type).notify('pong');
        expect(await received.promise).toBe('pong');
    });

    test('grants permissions passed with a generated token', async () => {
        const app = TestClients.app('granted');
        const omu = await clients.connect(app, () => {}, [OmuPermissions.REGISTRY_PERMISSION_ID]);
        expect(omu.ready).toBe(true);
    });
});

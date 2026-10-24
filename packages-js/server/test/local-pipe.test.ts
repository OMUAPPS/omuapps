import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { App, Omu } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';

import { Server, ServerConfig } from '../src/server';

class InProcessServer {
    public readonly root: string = mkdtempSync(path.join(tmpdir(), 'omuserver-local-'));
    public readonly token: string = 'dashboard-token';
    private readonly saved = new Map<string, string | undefined>();
    public server: Server | undefined;

    public async start(): Promise<Server> {
        for (const key of ['USERPROFILE', 'HOME', 'APPDATA', 'PROGRAMDATA']) {
            this.saved.set(key, process.env[key]);
            process.env[key] = path.join(this.root, key);
        }
        const port = await InProcessServer.freePort();
        this.server = new Server(new ServerConfig(this.root, '127.0.0.1', port, undefined, this.token));
        await this.server.start();
        return this.server;
    }

    public async stop(): Promise<void> {
        await this.server?.stop();
        for (const [key, value] of this.saved) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }

    private static freePort(): Promise<number> {
        return new Promise((resolve) => {
            const server = createServer();
            server.listen(0, '127.0.0.1', () => {
                const address = server.address();
                server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
            });
        });
    }
}

const local = new InProcessServer();
let server: Server;

beforeAll(async () => {
    server = await local.start();
});

afterAll(async () => {
    await local.stop();
});

test('a plugin client connects over the local pipe and serves endpoints', async () => {
    const pluginApp = new App('com.example:local-plugin', { type: 'plugin', version: '1.0.0' });
    const type = EndpointType.createJson<string, string>(pluginApp, { name: 'greet', permissionId: pluginApp.id.join('greet') });
    const plugin = server.pluginContext.createClient(pluginApp);
    plugin.endpoints.bind(type, async (name) => `hello ${name}`);
    void plugin.start();
    await plugin.waitForReady();
    expect(server.sessions.find(pluginApp.id)).toBeDefined();

    const dashboard = new Omu(new App('com.omuapps:dashboard', { type: 'dashboard' }), {
        address: { host: '127.0.0.1', port: server.config.port, secure: false },
        token: local.token,
    });
    void dashboard.start();
    await dashboard.waitForReady();
    expect(await dashboard.endpoints.call(type, 'world')).toBe('hello world');
    dashboard.stop();
    plugin.stop();
});

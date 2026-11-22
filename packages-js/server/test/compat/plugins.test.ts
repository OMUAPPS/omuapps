import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PLUGIN_ID } from '@omujs/obs/const.js';
import { CHECK_INSTALLED, SET_INSTALL } from '@omujs/obs/types.js';
import { DisconnectType } from '@omujs/omu/network';

import { ObsPlugin } from '../../src/plugins/obs';

import { TestClients } from './test-clients.js';
import { TypeScriptTestServer } from './test-server.js';

type ObsConfig = {
    server?: { host: string; port: number; hash?: string | null };
    launch?: { args: string[]; cwd?: string };
    log_path?: string;
};

class ObsFixture {
    public constructor(private readonly server: TypeScriptTestServer) {}

    public get directory(): string {
        return path.join(this.server.root, '.omuapps');
    }

    public config(): ObsConfig {
        return JSON.parse(readFileSync(path.join(this.directory, 'obs_config.json'), 'utf-8'));
    }

    public tokens(): Record<string, string> {
        return JSON.parse(readFileSync(path.join(this.directory, 'token.json'), 'utf-8'));
    }

    public pluginDirectory(): string {
        return path.join(this.server.root, 'ProgramData', 'obs-studio', 'plugins', 'omuapps');
    }
}

describe('bundled plugins', () => {
    const dashboardPath = path.join('C:', 'OMUAPPS', 'omuapps.exe');
    const server = new TypeScriptTestServer(['--dashboard-path', dashboardPath]);
    const clients = new TestClients(server);
    const obs = new ObsFixture(server);

    beforeAll(async () => {
        await server.start();
    }, 60_000);

    afterAll(async () => {
        clients.stop();
        await server.stop();
    });

    test('writes the OBS config with the server address', () => {
        const config = obs.config();
        expect(config.server?.port).toBe(server.port);
        expect(config.log_path?.endsWith('/logs')).toBe(true);
        expect(config.launch).toBeUndefined();
    });

    test('issues a token the OBS plugin can connect with', async () => {
        const address = obs.config().server;
        if (!address) throw new Error('Server address not written');
        const token = obs.tokens()[`${address.host}:${address.port}:${address.hash ?? ''}:${PLUGIN_ID.key()}`];
        expect(token).toBeString();
        const plugin = clients.create(ObsPlugin.APP, token);
        await clients.start(plugin);
        expect(plugin.ready).toBe(true);
        plugin.stop();
    });

    test('reports whether the OBS plugin files are in place', async () => {
        const dashboard = await clients.connectDashboard();
        expect(await dashboard.endpoints.call(CHECK_INSTALLED, null)).toEqual({ script_installed: false, launch_installed: false });
        mkdirSync(obs.pluginDirectory(), { recursive: true });
        expect(await dashboard.endpoints.call(CHECK_INSTALLED, null)).toEqual({ script_installed: true, launch_installed: false });
    });

    test('sets and clears the launch command', async () => {
        const dashboard = await clients.connectDashboard();
        await dashboard.endpoints.call(SET_INSTALL, { script_active: true, launch_active: true });
        expect(obs.config().launch?.args).toEqual([path.resolve(dashboardPath).split(path.sep).join('/'), '--background']);
        expect((await dashboard.endpoints.call(CHECK_INSTALLED, null)).launch_installed).toBe(true);
        await dashboard.endpoints.call(SET_INSTALL, { script_active: true, launch_active: false });
        expect(obs.config().launch).toBeUndefined();
    });

    test('accepts an app requiring a bundled plugin', async () => {
        const omu = await clients.connect(TestClients.app('obs-user'), (client) => {
            client.plugins.require({ omuplugin_obs: '>=0.10.0' });
        });
        expect(omu.ready).toBe(true);
    });

    test('rejects an app requiring a plugin that is not bundled', async () => {
        const app = TestClients.app('missing-plugin');
        const omu = clients.create(app, await clients.tokenFor(app));
        omu.plugins.require({ not_bundled: null });
        await omu.start().catch(() => undefined);
        expect(omu.network.reason?.type).toBe(DisconnectType.INVALID_VERSION);
    });
});

describe('uninstall', () => {
    test('removes the OBS files', async () => {
        const server = new TypeScriptTestServer();
        await server.start();
        await server.stop();
        const obs = new ObsFixture(server);
        expect(existsSync(path.join(obs.directory, 'obs_config.json'))).toBe(true);
        const child = Bun.spawn([...server.command(), '--uninstall'], {
            cwd: server.root,
            env: server.env(),
            stdout: 'ignore',
            stderr: 'ignore',
        });
        expect(await child.exited).toBe(0);
        expect(existsSync(path.join(obs.directory, 'obs_config.json'))).toBe(false);
        expect(existsSync(path.join(obs.directory, 'token.json'))).toBe(false);
    }, 60_000);
});

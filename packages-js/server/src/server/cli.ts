import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { VERSION } from '@omujs/omu';

import type { ServerPlugin } from '../api';
import { SystemProcesses } from '../system';

import { Server } from './server.js';
import { ServerConfig } from './server-config.js';
import { ServerLog } from './server-log.js';
import { ServerMigration } from './server-migration.js';

type CliOptions = {
    debug: boolean;
    stop: boolean;
    uninstall: boolean;
    token?: string;
    'token-file'?: string;
    'dashboard-path'?: string;
    port?: string;
    hash?: string;
    'trusted-host': string[];
};

export class Cli {
    public static async run(args: string[], plugins: readonly ServerPlugin[]): Promise<void> {
        ServerLog.install('logs', 'omuserver');
        console.info(`// omuserver v${VERSION} (pid=${process.pid}) at (${process.cwd()}) on (${process.platform} ${process.arch})`);
        const options = Cli.parse(args);
        const config = Cli.config(options);
        if (options.stop) {
            await Cli.stop(config.port);
            return;
        }
        const server = new Server(config, plugins);
        if (options.uninstall) {
            await server.plugins.uninstall();
            console.info('Successfully uninstalled plugins!');
            return;
        }
        ServerMigration.run(server.storage);
        console.info(`Starting at ${config.hash} http://${config.host}:${config.port}`);
        await server.start();
    }

    private static parse(args: string[]): CliOptions {
        const { values } = parseArgs({
            args,
            options: {
                'debug': { type: 'boolean', default: false },
                'stop': { type: 'boolean', default: false },
                'uninstall': { type: 'boolean', default: false },
                'token': { type: 'string' },
                'token-file': { type: 'string' },
                'dashboard-path': { type: 'string' },
                'port': { type: 'string' },
                'hash': { type: 'string' },
                'trusted-host': { type: 'string', multiple: true, default: [] },
            },
            strict: true,
        });
        return values;
    }

    private static config(options: CliOptions): ServerConfig {
        const token = options.token ?? (options['token-file'] ? readFileSync(options['token-file'], 'utf-8').trim() : undefined);
        const trustedHosts = Object.fromEntries(options['trusted-host'].map((entry) => {
            const [source, destination] = entry.split('=');
            return [source.trim(), destination.trim()];
        }));
        if (Object.keys(trustedHosts).length > 0) {
            console.info(`Extra trusted hosts: ${JSON.stringify(trustedHosts)}`);
        }
        if (options.debug) {
            console.warn('Debug mode enabled');
        }
        return new ServerConfig(
            process.cwd(),
            undefined,
            options.port ? Number(options.port) : undefined,
            options.hash,
            token,
            options['dashboard-path'],
            trustedHosts,
            options.debug,
        );
    }

    private static async stop(port: number): Promise<void> {
        console.info(`Stopping server processes using port ${port}`);
        const processes = (await SystemProcesses.table.listeningOn(port)).filter((entry) => entry.pid !== process.pid);
        if (processes.length === 0) {
            console.info(`No processes found using port ${port}`);
        }
        for (const entry of processes) {
            console.info(`Killing process ${entry.pid} (${entry.name})`);
            SystemProcesses.table.terminate(entry.pid);
        }
        console.info('Finished stopping server processes');
    }
}

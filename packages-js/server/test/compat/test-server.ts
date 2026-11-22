import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Subprocess } from 'bun';

export abstract class TestServer {
    public readonly root: string = mkdtempSync(path.join(tmpdir(), 'omuserver-compat-'));
    public readonly token: string = `dashboard-${crypto.randomUUID()}`;
    public port = 0;
    private process: Subprocess | undefined;

    public abstract readonly name: string;

    public constructor(private readonly extraArgs: string[] = []) {}

    public abstract command(): string[];

    public environment(): Record<string, string> {
        return {
            USERPROFILE: this.root,
            HOME: this.root,
            APPDATA: path.join(this.root, 'AppData', 'Roaming'),
            PROGRAMDATA: path.join(this.root, 'ProgramData'),
        };
    }

    public env(): Record<string, string | undefined> {
        const overrides = this.environment();
        const names = new Set(Object.keys(overrides).map((name) => name.toUpperCase()));
        const inherited = Object.entries(process.env).filter(([name]) => !names.has(name.toUpperCase()));
        return { ...Object.fromEntries(inherited), ...overrides };
    }

    public async start(): Promise<void> {
        this.port = await TestServer.freePort();
        this.process = Bun.spawn([...this.command(), '--port', String(this.port), '--token', this.token, ...this.extraArgs], {
            cwd: this.root,
            env: this.env(),
            stdout: Bun.file(path.join(this.root, 'stdout.log')),
            stderr: Bun.file(path.join(this.root, 'stderr.log')),
        });
        await this.waitUntilListening();
    }

    public async stop(): Promise<void> {
        this.process?.kill();
        await this.process?.exited;
    }

    private async waitUntilListening(): Promise<void> {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
            if (this.process?.exitCode !== null && this.process?.exitCode !== undefined) {
                throw new Error(`${this.name} server exited with ${this.process.exitCode}`);
            }
            try {
                const response = await fetch(`http://127.0.0.1:${this.port}/version`);
                if (response.ok) return;
            } catch {
                await Bun.sleep(250);
            }
        }
        throw new Error(`${this.name} server did not start`);
    }

    private static freePort(): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = createServer();
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => {
                const address = server.address();
                const port = typeof address === 'object' && address ? address.port : 0;
                server.close(() => resolve(port));
            });
        });
    }
}

export class TypeScriptTestServer extends TestServer {
    public readonly name = 'typescript';
    private static readonly MAIN = path.resolve(import.meta.dir, '../../src/main.ts');

    public command(): string[] {
        return [process.execPath, TypeScriptTestServer.MAIN];
    }
}

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

    protected abstract command(): string[];

    protected environment(): Record<string, string> {
        return {};
    }

    public async start(): Promise<void> {
        this.port = await TestServer.freePort();
        this.process = Bun.spawn([...this.command(), '--port', String(this.port), '--token', this.token], {
            cwd: this.root,
            env: { ...process.env, ...this.environment() },
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

export class PythonTestServer extends TestServer {
    public readonly name = 'python';
    private static readonly PYTHON = path.resolve(import.meta.dir, '../../../../.venv/Scripts/python.exe');

    protected command(): string[] {
        return [PythonTestServer.PYTHON, '-m', 'omuserver'];
    }

    protected environment(): Record<string, string> {
        return { USERPROFILE: this.root, HOME: this.root, PYTHONIOENCODING: 'utf-8' };
    }
}

export class TypeScriptTestServer extends TestServer {
    public readonly name = 'typescript';
    private static readonly MAIN = path.resolve(import.meta.dir, '../../src/main.ts');

    protected command(): string[] {
        return [process.execPath, TypeScriptTestServer.MAIN];
    }
}

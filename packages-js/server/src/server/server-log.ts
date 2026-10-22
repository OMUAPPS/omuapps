import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { formatWithOptions } from 'node:util';

export class ServerLog {
    private static readonly RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
    private static readonly LEVELS = ['debug', 'info', 'warn', 'error'] as const;

    private constructor(public readonly file: string) {}

    public static install(directory: string, name: string): ServerLog {
        const root = path.resolve(directory);
        mkdirSync(root, { recursive: true });
        ServerLog.cleanup(root);
        const log = new ServerLog(ServerLog.nextFile(root, name));
        mkdirSync(path.dirname(log.file), { recursive: true });
        for (const level of ServerLog.LEVELS) {
            const write = console[level].bind(console);
            console[level] = (...args: unknown[]) => {
                write(...args);
                log.append(level, args);
            };
        }
        console.info(`Logging to ${log.file}`);
        return log;
    }

    private append(level: string, args: unknown[]): void {
        const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const message = formatWithOptions({ colors: false }, ...args);
        try {
            appendFileSync(this.file, `${time} | ${level.toUpperCase().padEnd(8)} | ${message}\n`, 'utf-8');
        } catch {
            return;
        }
    }

    private static nextFile(root: string, name: string): string {
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8).replaceAll(':', '-');
        let file = path.join(root, date, `${time}-${name}.log`);
        for (let index = 1; existsSync(file); index++) {
            file = path.join(root, date, `${time}-${name}-${index}.log`);
        }
        return file;
    }

    private static cleanup(root: string): void {
        for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
            if (!entry.isFile()) continue;
            const file = path.join(entry.parentPath, entry.name);
            try {
                if (Date.now() - statSync(file).mtimeMs > ServerLog.RETENTION_MS) rmSync(file);
            } catch {
                continue;
            }
        }
    }
}

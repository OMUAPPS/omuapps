import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Identifier } from '@omujs/omu';

import { StoragePath } from './storage-path.js';

export class AssetStore {
    private readonly index: Database;

    public constructor(private readonly root: string) {
        mkdirSync(root, { recursive: true });
        this.index = new Database(path.join(root, 'index.sqlite'), { create: true });
        this.index.run(`
            CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            download_count INTEGER DEFAULT 0
            )
        `);
    }

    public file(id: Identifier): string {
        return this.resolve(StoragePath.of(id));
    }

    public write(id: Identifier, buffer: Uint8Array): void {
        const relative = StoragePath.of(id);
        const file = this.resolve(relative);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, buffer);
        this.insert(id, relative);
        this.index.query('UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id.key());
    }

    public read(id: Identifier): Uint8Array | undefined {
        const relative = StoragePath.of(id);
        const file = this.resolve(relative);
        if (!existsSync(file)) return;
        this.insert(id, relative);
        this.index.query(
            'UPDATE assets SET download_count = download_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ).run(id.key());
        return new Uint8Array(readFileSync(file));
    }

    public delete(id: Identifier): boolean {
        const row = this.index.query<{ path: string }, [string]>('SELECT path FROM assets WHERE id = ?').get(id.key());
        if (!row) return false;
        rmSync(this.resolve(row.path));
        this.index.query('DELETE FROM assets WHERE id = ?').run(id.key());
        return true;
    }

    public close(): void {
        this.index.close();
    }

    private insert(id: Identifier, relative: string): void {
        this.index.query('INSERT OR IGNORE INTO assets (id, path) VALUES (?, ?)').run(id.key(), relative);
    }

    private resolve(relative: string): string {
        const root = path.resolve(this.root);
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep)) {
            throw new Error(`Path ${relative} is not relative to ${root}`);
        }
        return file;
    }
}

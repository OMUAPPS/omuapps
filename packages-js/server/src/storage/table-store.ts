import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

type Row = { key: string; value: Uint8Array };

export class TableStore {
    private readonly database: Database;

    public constructor(file: string) {
        mkdirSync(path.dirname(file), { recursive: true });
        this.database = new Database(`${file}.db`, { create: true });
        this.database.run(
            'CREATE TABLE IF NOT EXISTS data ('
            + 'id INTEGER PRIMARY KEY AUTOINCREMENT,'
            + 'key TEXT UNIQUE,'
            + 'value BLOB'
            + ')',
        );
    }

    public get(key: string): Uint8Array | undefined {
        const row = this.database.query<Row, [string]>('SELECT key, value FROM data WHERE key = ?').get(key);
        if (!row) return;
        return row.value;
    }

    public getMany(keys: readonly string[]): Map<string, Uint8Array> {
        return TableStore.toMap(this.database.query<Row, string[]>(
            `SELECT key, value FROM data WHERE key IN (${TableStore.placeholders(keys)})`,
        ).all(...keys));
    }

    public setAll(items: ReadonlyMap<string, Uint8Array>): void {
        const insert = this.database.query('INSERT OR REPLACE INTO data (key, value) VALUES (?, ?)');
        this.database.transaction(() => {
            for (const [key, value] of items) {
                insert.run(key, value);
            }
        })();
    }

    public removeAll(keys: readonly string[]): void {
        this.database.query(`DELETE FROM data WHERE key IN (${TableStore.placeholders(keys)})`).run(...keys);
    }

    public has(key: string): boolean {
        return this.database.query('SELECT 1 FROM data WHERE key = ?').get(key) !== null;
    }

    public hasMany(keys: readonly string[]): Record<string, boolean> {
        const rows = this.database.query<{ key: string }, string[]>(
            `SELECT key FROM data WHERE key IN (${TableStore.placeholders(keys)})`,
        ).all(...keys);
        return Object.fromEntries(rows.map((row) => [row.key, true]));
    }

    public hasAll(keys: readonly string[]): boolean {
        const rows = this.database.query<{ key: string }, string[]>(
            `SELECT key FROM data WHERE key IN (${TableStore.placeholders(keys)})`,
        ).all(...keys);
        return rows.length === keys.length;
    }

    public hasAny(keys: readonly string[]): boolean {
        return this.database.query<{ found: number }, string[]>(
            `SELECT 1 AS found FROM data WHERE key IN (${TableStore.placeholders(keys)})`,
        ).get(...keys) !== null;
    }

    public fetchItems(limit: number, backward: boolean, cursor: string | null): Map<string, Uint8Array> {
        const order = backward ? 'DESC' : 'ASC';
        if (cursor === null) {
            return TableStore.toMap(this.database.query<Row, [number]>(
                `SELECT key, value FROM data ORDER BY id ${order} LIMIT ?`,
            ).all(limit));
        }
        const id = this.idOf(cursor);
        if (id === undefined) throw new Error(`Cursor ${cursor} not found`);
        const comparison = backward ? '<' : '>';
        return TableStore.toMap(this.database.query<Row, [number, number]>(
            `SELECT key, value FROM data WHERE id ${comparison} ? ORDER BY id ${order} LIMIT ?`,
        ).all(id, limit));
    }

    public fetchRange(start: string, end: string): Map<string, Uint8Array> {
        const startId = this.idOf(start);
        if (startId === undefined) throw new Error(`start key ${start} not found`);
        const endId = this.idOf(end);
        if (endId === undefined) throw new Error(`end key ${end} not found`);
        return TableStore.toMap(this.database.query<Row, [number, number]>(
            'SELECT key, value FROM data WHERE id >= ? AND id <= ?',
        ).all(startId, endId));
    }

    public fetchAll(): Map<string, Uint8Array> {
        return TableStore.toMap(this.database.query<Row, []>('SELECT key, value FROM data').all());
    }

    public clear(): void {
        this.database.run('DELETE FROM data');
    }

    public size(): number {
        const row = this.database.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM data').get();
        return row?.count ?? 0;
    }

    public close(): void {
        this.database.close();
    }

    private idOf(key: string): number | undefined {
        const row = this.database.query<{ id: number }, [string]>('SELECT id FROM data WHERE key = ?').get(key);
        if (!row) return;
        return row.id;
    }

    private static placeholders(keys: readonly string[]): string {
        return keys.map(() => '?').join(',');
    }

    private static toMap(rows: Row[]): Map<string, Uint8Array> {
        return new Map(rows.map((row) => [row.key, row.value]));
    }
}

import { describe, expect, test } from 'bun:test';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Identifier } from '@omujs/omu';

import { AssetStore, RegistryStore, StoragePath, StorageRoot, TableStore } from '../src/storage';

type PythonData = {
    identifiers: { key: string; sanitized_path: string; sanitized_key: string }[];
    tables: { id: string; file: string; rows: { id: number; key: string; value: string }[] }[];
    registries: { id: string; file: string; meta_file: string; value: string; permissions: Record<string, string | null> }[];
    assets: { id: string; file: string; index_path: string; content: string }[];
};

const FIXTURES = path.join(import.meta.dir, 'fixtures');
const PYTHON_DATA: PythonData = JSON.parse(readFileSync(path.join(FIXTURES, 'python-data.json'), 'utf-8'));

class Fixture {
    public static copy(): StorageRoot {
        const root = mkdtempSync(path.join(tmpdir(), 'omuserver-storage-'));
        cpSync(path.join(FIXTURES, 'python-data'), root, { recursive: true });
        return new StorageRoot(root);
    }

    public static bytes(base64: string): Uint8Array {
        return Uint8Array.fromBase64(base64);
    }
}

describe('StoragePath', () => {
    for (const identifier of PYTHON_DATA.identifiers) {
        test(`matches Python for ${identifier.key}`, () => {
            const id = Identifier.fromKey(identifier.key);
            expect(StoragePath.of(id)).toBe(identifier.sanitized_path);
            expect(StoragePath.key(id)).toBe(identifier.sanitized_key);
        });
    }
});

describe('TableStore', () => {
    const [table] = PYTHON_DATA.tables;

    test('places the file where Python does', () => {
        const root = Fixture.copy();
        const file = root.file('tables', Identifier.fromKey(table.id));
        expect(path.relative(root.root, `${file}.db`).split(path.sep).join('/')).toBe(table.file);
    });

    test('reads rows written by Python in insertion order', () => {
        const root = Fixture.copy();
        const store = new TableStore(root.file('tables', Identifier.fromKey(table.id)));
        const items = store.fetchItems(100, false, null);
        expect([...items.keys()]).toEqual(table.rows.map((row) => row.key));
        for (const row of table.rows) {
            expect(store.get(row.key)).toEqual(Fixture.bytes(row.value));
        }
        expect(store.size()).toBe(table.rows.length);
        store.close();
    });

    test('pages with a cursor in both directions', () => {
        const root = Fixture.copy();
        const store = new TableStore(root.file('tables', Identifier.fromKey(table.id)));
        const keys = table.rows.map((row) => row.key);
        expect([...store.fetchItems(2, false, keys[0]).keys()]).toEqual(keys.slice(1, 3));
        expect([...store.fetchItems(2, true, null).keys()]).toEqual(keys.slice(-2).reverse());
        expect([...store.fetchItems(10, true, keys[2]).keys()]).toEqual(keys.slice(0, 2).reverse());
        expect([...store.fetchRange(keys[1], keys[3]).keys()]).toEqual(keys.slice(1, 4));
        store.close();
    });

    test('reports existence like Python', () => {
        const root = Fixture.copy();
        const store = new TableStore(root.file('tables', Identifier.fromKey(table.id)));
        expect(store.hasMany(['key1', 'missing'])).toEqual({ key1: true });
        expect(store.hasAll(['key1', 'key4'])).toBe(true);
        expect(store.hasAll(['key1', 'missing'])).toBe(false);
        expect(store.hasAny(['missing', 'key5'])).toBe(true);
        expect(store.hasAny(['missing'])).toBe(false);
        store.close();
    });
});

describe('RegistryStore', () => {
    const [registry] = PYTHON_DATA.registries;

    test('reads the value and permissions written by Python', () => {
        const root = Fixture.copy();
        const file = root.file('registry', Identifier.fromKey(registry.id));
        expect(path.relative(root.root, file).split(path.sep).join('/')).toBe(registry.file);
        const store = new RegistryStore(file);
        expect(store.readValue()).toEqual(Fixture.bytes(registry.value));
        expect(store.readMeta()).toEqual({ permissions: registry.permissions });
    });
});

describe('AssetStore', () => {
    const [asset] = PYTHON_DATA.assets;

    test('reads and deletes an asset written by Python', () => {
        const root = Fixture.copy();
        const store = new AssetStore(root.assets);
        const id = Identifier.fromKey(asset.id);
        expect(path.relative(root.root, store.file(id)).split(path.sep).join('/')).toBe(asset.file);
        expect(store.read(id)).toEqual(Fixture.bytes(asset.content));
        expect(store.delete(id)).toBe(true);
        expect(store.read(id)).toBeUndefined();
        store.close();
    });
});

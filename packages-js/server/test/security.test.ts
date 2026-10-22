import { describe, expect, test } from 'bun:test';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { App, type AppJson, Identifier } from '@omujs/omu';

import { PermissionManager } from '../src/security';
import { StorageRoot } from '../src/storage';

type PythonApps = {
    apps: { id: string; token: string; app: AppJson; permissions: string[] }[];
};

const FIXTURES = path.join(import.meta.dir, 'fixtures');
const PYTHON_DATA: PythonApps = JSON.parse(readFileSync(path.join(FIXTURES, 'python-data.json'), 'utf-8'));

class SecurityFixture {
    public static load(): PermissionManager {
        const root = mkdtempSync(path.join(tmpdir(), 'omuserver-security-'));
        cpSync(path.join(FIXTURES, 'python-data'), root, { recursive: true });
        return PermissionManager.load(new StorageRoot(root).directory('security'), 'dashboard');
    }
}

describe('PermissionManager', () => {
    for (const entry of PYTHON_DATA.apps) {
        test(`verifies ${entry.id} with the token issued by Python`, async () => {
            const manager = SecurityFixture.load();
            const verification = await manager.verifyApp(App.deserialize(entry.app), entry.token);
            expect(verification.ok).toBe(true);
            if (!verification.ok) return;
            for (const permission of entry.permissions) {
                expect(verification.handle.has(Identifier.fromKey(permission))).toBe(true);
            }
        });

        test(`rejects ${entry.id} with a wrong token`, async () => {
            const manager = SecurityFixture.load();
            const verification = await manager.verifyApp(App.deserialize(entry.app), `${entry.token}x`);
            expect(verification.ok).toBe(false);
        });
    }

    test('limits a child app to the permissions its parent has', async () => {
        const manager = SecurityFixture.load();
        const parent = new App('com.example:family', { version: '1.0.0' });
        const child = new App('com.example:family/child', { parentId: parent.id, type: 'remote' });
        const shared = Identifier.fromKey('com.example:family/shared');
        const childOnly = Identifier.fromKey('com.example:family/child-only');
        manager.generateAppToken(parent).handle.grant(shared);
        const { handle, token } = manager.generateAppToken(child);
        handle.grantAll([shared, childOnly]);
        const verification = await manager.verifyApp(child, token);
        expect(verification.ok).toBe(true);
        if (!verification.ok) return;
        expect(verification.handle.has(shared)).toBe(true);
        expect(verification.handle.has(childOnly)).toBe(false);
    });

    test('reads permission types written by Python', () => {
        const manager = SecurityFixture.load();
        expect(manager.permissions.get(Identifier.fromKey('com.example:app/permission'))?.metadata.level).toBe('low');
    });
});

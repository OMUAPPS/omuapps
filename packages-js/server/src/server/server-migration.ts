import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { VERSION } from '@omujs/omu';

import type { StorageRoot } from '../storage';

export class ServerMigration {
    private static readonly LEGACY_VERSIONS = new Set(['0.0.0', '0.9.10', '0.9.13']);

    public static run(storage: StorageRoot): void {
        const previous = existsSync(storage.version) ? readFileSync(storage.version, 'utf-8').trim() : '0.0.0';
        if (ServerMigration.LEGACY_VERSIONS.has(previous)) {
            rmSync(path.join(storage.directory('security'), 'tokens.sqlite'), { force: true });
        }
        writeFileSync(storage.version, VERSION, 'utf-8');
    }
}

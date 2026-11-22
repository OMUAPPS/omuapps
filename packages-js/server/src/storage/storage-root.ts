import { mkdirSync } from 'node:fs';
import path from 'node:path';

import type { Identifier } from '@omujs/omu';

import { StoragePath } from './storage-path.js';

export class StorageRoot {
    public readonly data: string;
    public readonly assets: string;
    public readonly version: string;

    public constructor(public readonly root: string) {
        this.data = path.join(root, 'data');
        this.assets = path.join(root, 'assets');
        this.version = path.join(root, 'VERSION');
        mkdirSync(this.data, { recursive: true });
        mkdirSync(this.assets, { recursive: true });
    }

    public directory(name: string): string {
        const directory = path.join(this.data, name);
        mkdirSync(directory, { recursive: true });
        return directory;
    }

    public file(name: string, id: Identifier): string {
        return path.join(this.directory(name), ...StoragePath.of(id).split('/'));
    }
}

import { createHash } from 'node:crypto';

import type { Identifier } from '@omujs/omu';

export class StoragePath {
    private static readonly UNSAFE = /[^\p{L}\p{N}_]/gu;

    public static of(id: Identifier): string {
        const namespace = `${StoragePath.sanitize(id.namespace)}-${StoragePath.hash(id.namespace)}`;
        const names = id.path.map((name) => StoragePath.sanitize(name)).join('-');
        return `${namespace}/${names}-${StoragePath.hash(id.path.join('/'))}`;
    }

    public static key(id: Identifier): string {
        const key = id.key();
        return `${StoragePath.sanitize(key)}-${StoragePath.hash(key)}`;
    }

    private static sanitize(name: string): string {
        return name.replace(StoragePath.UNSAFE, '_');
    }

    private static hash(text: string): string {
        return createHash('md5').update(text, 'utf8').digest('hex');
    }
}

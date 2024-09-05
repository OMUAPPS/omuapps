import type { Keyable } from './interface.js';
import type { Model } from './model.js';

const NAMESPACE_REGEX = /^(\.[^/:.]|[\w-])+$/;
const NAME_REGEX = /^[^/:.]+$/;

export class Identifier implements Model<string>, Keyable {
    public readonly namespace: string;
    public readonly path: string[];

    constructor(
        namespace: string,
        ...path: string[]
    ) {
        Identifier.validate(namespace, path);
        this.namespace = namespace;
        this.path = path;
    }

    static validate(namespace: string, path: string[]): void {
        if (!namespace) {
            throw new Error('Invalid namespace: Namespace cannot be empty');
        }
        if (path.length === 0) {
            throw new Error('Invalid path: Path must have at least one name');
        }
        if (!NAMESPACE_REGEX.test(namespace)) {
            throw new Error(`Invalid namespace: Namespace must match ${NAMESPACE_REGEX}`);
        }
        for (const name of path) {
            if (!NAME_REGEX.test(name)) {
                throw new Error(`Invalid path: Name must match ${NAME_REGEX}`);
            }
        }
    }

    static format(namespace: string, ...path: string[]): string {
        Identifier.validate(namespace, path);
        return `${namespace}:${path.join('/')}`;
    }

    static fromKey(key: string): Identifier {
        const separator = key.indexOf(':');
        if (separator === -1) {
            throw new Error(`Invalid key: No separator found in ${key}`);
        }
        if (key.indexOf(':', separator + 1) !== -1) {
            throw new Error(`Invalid key: Multiple separators found in ${key}`);
        }
        const namespace = key.slice(0, separator);
        const path = key.slice(separator + 1);
        if (!namespace || !path) {
            throw new Error('Invalid key: Namespace and path cannot be empty');
        }
        return new Identifier(namespace, ...path.split('/'));
    }

    static fromUrl(url: string | URL): Identifier {
        let parsedUrl: URL;
        if (typeof url === 'string') {
            parsedUrl = new URL(url);
        } else {
            parsedUrl = url;
        }
        const namespace = parsedUrl.hostname;
        const path = parsedUrl.pathname.slice(1).split('/');
        return new Identifier(namespace, ...path);
    }

    public toJson(): string {
        return this.key();
    }

    static fromJson(json: string): Identifier {
        return Identifier.fromKey(json);
    }

    public key(): string {
        return Identifier.format(this.namespace, ...this.path);
    }

    public isEqual(other: Identifier): boolean {
        return this.key() === other.key();
    }

    public isSubpathOf(other: Identifier): boolean {
        if (this.namespace !== other.namespace) {
            return false;
        }
        if (this.path.length < other.path.length) {
            return false;
        }
        for (let i = 0; i < other.path.length; i++) {
            if (this.path[i] !== other.path[i]) {
                return false;
            }
        }
        return true;
    }

    public join(...path: string[]): Identifier {
        return new Identifier(this.namespace, ...this.path, ...path);
    }
}

export class IdentifierMap<T> {
    private readonly map: Map<string, T> = new Map();

    public get size(): number {
        return this.map.size;
    }

    public set(identifier: Identifier, value: T): void {
        this.map.set(identifier.key(), value);
    }

    public get(identifier: Identifier): T | undefined {
        return this.map.get(identifier.key());
    }

    public has(identifier: Identifier): boolean {
        return this.map.has(identifier.key());
    }

    public delete(identifier: Identifier): void {
        this.map.delete(identifier.key());
    }

    public clear(): void {
        this.map.clear();
    }

    public *keys(): IterableIterator<Identifier> {
        for (const key of this.map.keys()) {
            yield Identifier.fromKey(key);
        }
    }

    public values(): IterableIterator<T> {
        return this.map.values();
    }

    public *entries(): IterableIterator<[Identifier, T]> {
        for (const [key, value] of this.map.entries()) {
            yield [Identifier.fromKey(key), value];
        }
    }

    public [Symbol.iterator](): IterableIterator<[Identifier, T]> {
        return this.entries();
    }
}

export class IdentifierSet {
    private readonly set: Set<string> = new Set();

    public get size(): number {
        return this.set.size;
    }

    public add(identifier: Identifier): void {
        this.set.add(identifier.key());
    }

    public has(identifier: Identifier): boolean {
        return this.set.has(identifier.key());
    }

    public delete(identifier: Identifier): void {
        this.set.delete(identifier.key());
    }

    public clear(): void {
        this.set.clear();
    }

    public *keys(): IterableIterator<Identifier> {
        for (const key of this.set.keys()) {
            yield Identifier.fromKey(key);
        }
    }

    public values(): IterableIterator<Identifier> {
        return this.keys();
    }

    public *entries(): IterableIterator<[Identifier, Identifier]> {
        for (const key of this.set.keys()) {
            const identifier = Identifier.fromKey(key);
            yield [identifier, identifier];
        }
    }

    public [Symbol.iterator](): IterableIterator<[Identifier, Identifier]> {
        return this.entries();
    }
}

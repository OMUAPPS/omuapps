import type { EventEmitter, Unlisten } from '../../event-emitter.js';
import type { Identifier } from '../../identifier.js';
import type { JsonType, Serializable } from '../../serializer.js';
import { Serializer } from '../../serializer.js';
import type { ExtensionType } from '../extension.js';

export type TableConfig = {
    cache_size: number;
};

export interface Table<T> {
    readonly cache: ReadonlyMap<string, T>;
    readonly event: TableEvents<T>;
    get(key: string): Promise<T | undefined>;
    getMany(...keys: string[]): Promise<Map<string, T>>;
    add(...item: T[]): Promise<void>;
    update(...item: T[]): Promise<void>;
    remove(...items: T[]): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    hasMany<T extends Record<string, unknown>>(...keys: (keyof T)[]): Promise<{ [key in keyof T]: boolean }>;
    hasAll(...keys: string[]): Promise<boolean>;
    hasAny(...keys: string[]): Promise<boolean>;

    fetchItems({
        limit,
        backward,
        cursor,
    }: {
        limit: number;
        backward?: boolean;
        cursor?: string;
    }): Promise<Map<string, T>>;
    fetchRange({ start, end }: { start: string; end: string }): Promise<Map<string, T>>;
    fetchAll(): Promise<Map<string, T>>;
    iterate({ backward, cursor }: { backward?: boolean; cursor?: string }): AsyncIterable<T>;
    size(): Promise<number>;

    proxy(proxy: (item: T) => T | undefined): Unlisten;
    setCacheSize(size: number): void;
    setConfig(config: TableConfig): void;
    setPermissions(permissions: TablePermissions): void;

    listen(listener?: (items: Map<string, T>) => void): Unlisten;
}

export type TableEvents<T> = {
    add: EventEmitter<[Map<string, T>]>;
    update: EventEmitter<[Map<string, T>]>;
    remove: EventEmitter<[Map<string, T>]>;
    clear: EventEmitter<[]>;
    cacheUpdate: EventEmitter<[Map<string, T>]>;
};

export type TablePermissions = {
    all?: Identifier;
    read?: Identifier;
    write?: Identifier;
    remove?: Identifier;
    proxy?: Identifier;
};

export class TableType<T> {
    constructor(
        public id: Identifier,
        public serializer: Serializable<T, Uint8Array>,
        public keyFunction: (item: T) => string,
        public permissions?: TablePermissions | undefined,
    ) {}

    public static createJson<T, D extends JsonType = JsonType>(
        identifier: Identifier | ExtensionType,
        {
            name,
            key,
            permissions,
            serializer,
        }: {
            name: string;
            key: (item: T) => string;
            permissions?: TablePermissions;
            serializer?: Serializable<T, D>;
        },
    ): TableType<T> {
        return new TableType<T>(
            identifier.join(name),
            Serializer.wrap<T, D, Uint8Array>(serializer ?? Serializer.noop(), Serializer.json()),
            key,
            permissions
        );
    }
}

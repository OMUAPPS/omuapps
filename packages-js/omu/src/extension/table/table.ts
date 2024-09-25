import type { EventEmitter, Unlisten } from '../../event-emitter.js';
import type { Identifier } from '../../identifier.js';
import type { Keyable } from '../../interface.js';
import type { Model } from '../../model.js';
import type { Serializable } from '../../serializer.js';
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
        public permissions?: TablePermissions,
    ) {}

    public static createModel<T extends Keyable & Model<D>, D = unknown>(
        identifier: Identifier | ExtensionType,
        {
            name,
            model,
            permissions,
        }: {
            name: string;
            model: { fromJson(data: D): T };
            permissions?: TablePermissions;
        },
    ): TableType<T> {
        return new TableType<T>(
            identifier.join(name),
            Serializer.model(model).pipe(Serializer.json()),
            (item) => item.key(),
            permissions,
        );
    }

    public static createJson<T>(
        identifier: Identifier | ExtensionType,
        {
            name,
            key,
            permissions,
        }: {
            name: string;
            key: (item: T) => string;
            permissions?: TablePermissions;
        },
    ): TableType<T> {
        return new TableType<T>(identifier.join(name), Serializer.json<T>(), key, permissions);
    }
}

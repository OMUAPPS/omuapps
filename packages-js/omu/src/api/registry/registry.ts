import type { Unlisten } from '../../event';
import { Identifier, IntoId } from '../../identifier';
import type { JsonType, Serializable } from '../../serialize';
import { Serializer } from '../../serialize';

export interface RegistryPermissionsJSON {
    all?: string;
    read?: string;
    write?: string;
}

export interface RegistryPermissions {
    all?: IntoId;
    read?: IntoId;
    write?: IntoId;
}

export class RegistryType<T> {
    constructor(
        public readonly id: Identifier,
        public readonly defaultValue: T,
        public readonly serializer: Serializable<T, Uint8Array>,
        public readonly permissions: RegistryPermissions,
    ) { }

    public static createJson<T, D extends JsonType = JsonType>(identifier: IntoId, {
        name,
        defaultValue,
        permissions,
        serializer,
    }: {
        name: string;
        defaultValue: T;
        permissions?: RegistryPermissions;
        serializer?: Serializable<T, D>;
    }): RegistryType<T> {
        return new RegistryType(
            Identifier.from(identifier).join(name),
            defaultValue,
            Serializer.pipe<T, D, Uint8Array>(serializer ?? Serializer.noop(), Serializer.json()),
            permissions ?? {},
        );
    }

    public static createSerialized<T>(identifier: IntoId, {
        name,
        defaultValue,
        serializer,
        permissions,
    }: {
        name: string;
        defaultValue: T;
        serializer: Serializable<T, Uint8Array>;
        permissions?: RegistryPermissions;
    }): RegistryType<T> {
        return new RegistryType(
            Identifier.from(identifier).join(name),
            defaultValue,
            serializer,
            permissions ?? {},
        );
    }
}

export interface Registry<T> {
    readonly type: RegistryType<T>;
    readonly value: T;
    get(): Promise<T>;
    set(value: T): Promise<void>;
    update(fn: (value: T) => PromiseLike<T> | T): Promise<T>;
    modify(fn: (value: T) => PromiseLike<void> | void): Promise<T>;
    listen(fn: (value: T) => void): Unlisten;

    compatSvelte(): Writable<T>;
}

export type Subscriber<T> = (value: T) => void;

export type Unsubscriber = () => void;

export type Updater<T> = (value: T) => T;

export type StartStopNotifier<T> = (
    set: (value: T) => void,
    update: (fn: Updater<T>) => void
) => void | (() => void);

export interface Readable<T> {
    subscribe(this: void, run: Subscriber<T>): Unsubscriber;
}

export interface Writable<T> extends Readable<T> {
    set(this: void, value: T): void;
    update(this: void, updater: Updater<T>): void;
    wait(): Promise<T>;
}

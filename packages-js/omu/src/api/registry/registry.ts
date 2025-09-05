import type { Unlisten } from '../../event';
import { Identifier } from '../../identifier';
import type { ByteReader, ByteWriter, JsonType, Serializable } from '../../serialize';
import { Flags, Serializer } from '../../serialize';

export class RegistryPermissions {
    constructor(
        public readonly all?: Identifier | undefined,
        public readonly read?: Identifier | undefined,
        public readonly write?: Identifier | undefined,
    ) { }

    public serialize(writer: ByteWriter): void {
        const flags = new Flags({ length: 3 });
        flags.set(0, this.all !== undefined);
        flags.set(1, this.read !== undefined);
        flags.set(2, this.write !== undefined);
        writer.writeFlags(flags);
        if (this.all !== undefined) {
            writer.writeString(this.all.key());
        }
        if (this.read !== undefined) {
            writer.writeString(this.read.key());
        }
        if (this.write !== undefined) {
            writer.writeString(this.write.key());
        }
    }

    public static deserialize(reader: ByteReader): RegistryPermissions {
        const flags = reader.readFlags(3);
        const all = flags.has(0) ? Identifier.fromKey(reader.readString()) : undefined;
        const read = flags.has(1) ? Identifier.fromKey(reader.readString()) : undefined;
        const write = flags.has(2) ? Identifier.fromKey(reader.readString()) : undefined;
        return new RegistryPermissions(
            all,
            read,
            write,
        );
    }
}

export class RegistryType<T> {
    constructor(
        public readonly id: Identifier,
        public readonly defaultValue: T,
        public readonly serializer: Serializable<T, Uint8Array>,
        public readonly permissions: RegistryPermissions,
    ) { }

    public static createJson<T, D extends JsonType = JsonType>(identifier: Identifier, {
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
            identifier.join(name),
            defaultValue,
            Serializer.pipe<T, D, Uint8Array>(serializer ?? Serializer.noop(), Serializer.json()),
            permissions ?? new RegistryPermissions(),
        );
    }

    public static createSerialized<T>(identifier: Identifier, {
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
            identifier.join(name),
            defaultValue,
            serializer,
            permissions ?? new RegistryPermissions(),
        );
    }
}

export interface Registry<T> {
    readonly type: RegistryType<T>;
    readonly value: T;
    get(): Promise<T>;
    set(value: T): Promise<void>;
    update(fn: (value: T) => PromiseLike<T> | T): Promise<T>;
    modify(fn: (value: T) => PromiseLike<T> | T): Promise<T>;
    listen(fn: (value: T) => void): Unlisten;
}

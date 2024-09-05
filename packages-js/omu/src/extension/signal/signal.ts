import type { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Flags } from '../../bytebuffer.js';
import type { Unlisten } from '../../event-emitter.js';
import { Identifier } from '../../identifier.js';
import type { Serializable } from '../../serializer.js';
import { Serializer } from '../../serializer.js';

export class SignalPermissions {
    constructor(
        public readonly all?: Identifier,
        public readonly listen?: Identifier,
        public readonly send?: Identifier,
    ) {}

    public serialize(writer: ByteWriter): void {
        const flags = new Flags({length: 3});
        flags.set(0, this.all !== undefined);
        flags.set(1, this.listen !== undefined);
        flags.set(2, this.send !== undefined);
        writer.writeFlags(flags);
        if (this.all !== undefined) {
            writer.writeString(this.all.key());
        }
        if (this.listen !== undefined) {
            writer.writeString(this.listen.key());
        }
        if (this.send !== undefined) {
            writer.writeString(this.send.key());
        }
    }

    public static deserialize(reader: ByteReader): SignalPermissions {
        const flags = reader.readFlags(3);
        const all = flags.ifSet(0, () => Identifier.fromKey(reader.readString()));
        const listen = flags.ifSet(1, () => Identifier.fromKey(reader.readString()));
        const send = flags.ifSet(2, () => Identifier.fromKey(reader.readString()));
        return new SignalPermissions(all, listen, send);
    }
}
export class SignalType<T> {
    constructor(
        public readonly id: Identifier,
        public readonly serializer: Serializable<T, Uint8Array>,
        public readonly permissions: SignalPermissions,
    ) {}

    static createJson<T>(
        identifier: Identifier,
        {
            name,
            serializer,
            permissions,
        }: {
            name: string;
            serializer?: Serializable<T, any>;
            permissions?: SignalPermissions;
        },
    ): SignalType<T> {
        return new SignalType(
            identifier.join(name),
            Serializer.of<T, any>(serializer ?? Serializer.noop()).toJson(),
            permissions ?? new SignalPermissions(),
        );
    }

    static createSerialized<T>(
        identifier: Identifier,
        {
            name,
            serializer,
            permissions,
        }: {
            name: string;
            serializer: Serializable<T, Uint8Array>;
            permissions?: SignalPermissions;
        },
    ): SignalType<T> {
        return new SignalType(
            identifier.join(name),
            serializer,
            permissions ?? new SignalPermissions(),
        );
    }
}

export interface Signal<T> {
    listen(handler: (value: T) => void): Unlisten;
    notify(body: T): void;
}

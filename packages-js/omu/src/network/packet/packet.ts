import type { Identifier } from '../../identifier.js';
import { JsonType, type Serializable, Serializer } from '../../serializer.js';

export interface PacketData {
    readonly type: string;
    readonly data: Uint8Array;
}

export interface Packet<T = unknown> {
    readonly type: PacketType<T>;
    readonly data: T;
}

export class PacketType<T> {
    constructor(
        public readonly id: Identifier,
        public readonly serializer: Serializable<T, Uint8Array>,
    ) { }

    static createJson<T, D extends JsonType = JsonType>(identifier: Identifier, {
        name,
        serializer,
    }: {
        name: string;
        serializer?: Serializable<T, D>;
    }): PacketType<T> {
        return new PacketType<T>(
            identifier.join(name),
            Serializer.pipe<T, D, Uint8Array>(serializer ?? Serializer.noop(), Serializer.json()),
        );
    }

    static createSerialized<T>(identifier: Identifier, {
        name,
        serializer,
    }: {
        name: string;
        serializer: Serializable<T, Uint8Array>;
    }): PacketType<T> {
        return new PacketType(
            identifier.join(name),
            serializer,
        );
    }
}

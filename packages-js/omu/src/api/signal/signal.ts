import type { Unlisten } from '../../event';
import { Identifier, IntoId } from '../../identifier';
import type { Serializable } from '../../serialize';
import { Serializer } from '../../serialize';

export interface SignalPermissions {
    all?: Identifier | undefined;
    listen?: Identifier | undefined;
    send?: Identifier | undefined;
}

export class SignalType<T> {
    constructor(
        public readonly id: Identifier,
        public readonly serializer: Serializable<T, Uint8Array>,
        public readonly permissions: SignalPermissions,
    ) {}

    static createJson<T>(
        identifier: IntoId,
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
            Identifier.from(identifier).join(name),
            Serializer.of<T, any>(serializer ?? Serializer.noop()).toJson(),
            permissions ?? {},
        );
    }

    static createSerialized<T>(
        identifier: IntoId,
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
            Identifier.from(identifier).join(name),
            serializer,
            permissions ?? {},
        );
    }
}

export interface Signal<T> {
    listen(handler: (value: T) => void): Unlisten;
    notify(body: T): void;
}

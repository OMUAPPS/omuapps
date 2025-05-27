import type { Identifier } from '../../identifier.js';
import { type Serializable, Serializer } from '../../serializer.js';

export class EndpointType<Req = unknown, Res = unknown> {
    constructor(
        public readonly id: Identifier,
        public readonly requestSerializer: Serializable<Req, Uint8Array>,
        public readonly responseSerializer: Serializable<Res, Uint8Array>,
        public readonly permissionId?: Identifier | undefined,
    ) { }

    static createJson<Req, Res>(
        identifier: Identifier,
        {
            name,
            requestSerializer,
            responseSerializer,
            permissionId,
        }: {
            name: string,
            requestSerializer?: Serializable<Req, any>,
            responseSerializer?: Serializable<Res, any>,
            permissionId?: Identifier,
        },
    ): EndpointType<Req, Res> {
        return new EndpointType<Req, Res>(
            identifier.join(name),
            Serializer.of<Req, any>(requestSerializer ?? Serializer.noop())
                .pipe(Serializer.json()),
            Serializer.of<Res, any>(responseSerializer ?? Serializer.noop())
                .pipe(Serializer.json()),
            permissionId,
        );
    }

    static createSerialized<Req, Res>(
        identifier: Identifier,
        {
            name,
            requestSerializer,
            responseSerializer,
            permissionId,
        }: {
            name: string,
            requestSerializer: Serializable<Req, Uint8Array>,
            responseSerializer: Serializable<Res, Uint8Array>,
            permissionId?: Identifier,
        },
    ): EndpointType<Req, Res> {
        return new EndpointType<Req, Res>(
            identifier.join(name),
            requestSerializer,
            responseSerializer,
            permissionId,
        );
    }
}


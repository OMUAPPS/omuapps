import { Identifier, IntoId } from '../../identifier';
import { JsonType, type Serializable, Serializer } from '../../serialize';

export class EndpointType<Req = unknown, Res = unknown> {
    constructor(
        public readonly id: Identifier,
        public readonly requestSerializer: Serializable<Req, Uint8Array>,
        public readonly responseSerializer: Serializable<Res, Uint8Array>,
        public readonly permissionId?: Identifier | undefined,
    ) { }

    static createJson<Req, Res, ReqData extends JsonType = JsonType, ResData extends JsonType = JsonType>(
        identifier: IntoId,
        {
            name,
            requestSerializer,
            responseSerializer,
            permissionId,
        }: {
            name: string;
            requestSerializer?: Serializable<Req, ReqData>;
            responseSerializer?: Serializable<Res, ResData>;
            permissionId?: Identifier;
        },
    ): EndpointType<Req, Res> {
        return new EndpointType<Req, Res>(
            Identifier.from(identifier).join(name),
            Serializer.pipe<Req, JsonType, Uint8Array>(requestSerializer ?? Serializer.noop(), Serializer.json()),
            Serializer.pipe<Res, JsonType, Uint8Array>(responseSerializer ?? Serializer.noop(), Serializer.json()),
            permissionId,
        );
    }

    static createSerialized<Req, Res>(
        identifier: IntoId,
        {
            name,
            requestSerializer,
            responseSerializer,
            permissionId,
        }: {
            name: string;
            requestSerializer: Serializable<Req, Uint8Array>;
            responseSerializer: Serializable<Res, Uint8Array>;
            permissionId?: Identifier;
        },
    ): EndpointType<Req, Res> {
        return new EndpointType<Req, Res>(
            Identifier.from(identifier).join(name),
            requestSerializer,
            responseSerializer,
            permissionId,
        );
    }
}


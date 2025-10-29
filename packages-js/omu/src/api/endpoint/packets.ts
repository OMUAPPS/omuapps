import { Identifier, IdentifierMap } from '../../identifier';
import { ByteReader, ByteWriter } from '../../serialize';

export class EndpointRegisterPacket {
    constructor(
        public endpoints: IdentifierMap<Identifier | undefined>,
    ) { }

    public static serialize(item: EndpointRegisterPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(item.endpoints.size);
        for (const [key, value] of item.endpoints) {
            writer.writeString(key.key());
            writer.writeString(value?.key() ?? '');
        }
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointRegisterPacket {
        const reader = ByteReader.fromUint8Array(item);
        const count = reader.readULEB128();
        const endpoints = new IdentifierMap<Identifier | undefined>();
        for (let i = 0; i < count; i++) {
            const key = Identifier.fromKey(reader.readString());
            const value = Identifier.fromKey(reader.readString());
            endpoints.set(key, value);
        }
        return new EndpointRegisterPacket(endpoints);
    }
}

export class InvokedParams {
    constructor(
        public readonly id: Identifier,
        public readonly caller: Identifier,
        public readonly key: number,
    ) { }

    public static serialize(item: InvokedParams): string {
        return JSON.stringify({
            id: item.id.key(),
            caller: item.caller.key(),
            key: item.key,
        });
    }

    public static deserialize(item: string): InvokedParams {
        const data: {
            id: string;
            caller: string;
            key: number;
        } = JSON.parse(item);
        return new InvokedParams(
            Identifier.fromKey(data.id),
            Identifier.fromKey(data.caller),
            data.key,
        );
    }
};

export class EndpointInvokedPacket {
    constructor(
        public params: InvokedParams,
        public buffer: Uint8Array,
    ) { }

    public static serialize(item: EndpointInvokedPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(InvokedParams.serialize(item.params));
        writer.writeUint8Array(item.buffer);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointInvokedPacket {
        const reader = ByteReader.fromUint8Array(item);
        const params = InvokedParams.deserialize(reader.readString());
        const buffer = reader.readUint8Array();
        return new EndpointInvokedPacket(params, buffer);
    }
}

export class InvokeParams {
    constructor(
        public readonly id: Identifier,
        public readonly key: number,
    ) { }

    public static serialize(item: InvokeParams): string {
        return JSON.stringify({
            id: item.id.key(),
            key: item.key,
        });
    }

    public static deserialize(item: string): InvokeParams {
        const data: {
            id: string;
            key: number;
        } = JSON.parse(item);
        return new InvokeParams(
            Identifier.fromKey(data.id),
            data.key,
        );
    }
};

export class EndpointInvokePacket {
    constructor(
        public params: InvokeParams,
        public buffer: Uint8Array,
    ) { }

    public static serialize(item: EndpointInvokePacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(InvokeParams.serialize(item.params));
        writer.writeUint8Array(item.buffer);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointInvokePacket {
        const reader = ByteReader.fromUint8Array(item);
        const params = InvokeParams.deserialize(reader.readString());
        const buffer = reader.readUint8Array();
        return new EndpointInvokePacket(params, buffer);
    }
}

export class ResponseParams {
    constructor(
        public readonly id: Identifier,
        public readonly key: number,
        public readonly error: string | null,
    ) { }

    public static serialize(item: ResponseParams): string {
        return JSON.stringify({
            id: item.id.key(),
            key: item.key,
            error: item.error,
        });
    }

    public static deserialize(item: string): ResponseParams {
        const data: {
            id: string;
            key: number;
            error: string | null;
        } = JSON.parse(item);
        return new ResponseParams(
            Identifier.fromKey(data.id),
            data.key,
            data.error,
        );
    }
};

export class EndpointResponsePacket {
    constructor(
        public params: ResponseParams,
        public buffer: Uint8Array,
    ) { }

    public static serialize(item: EndpointResponsePacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(ResponseParams.serialize(item.params));
        writer.writeUint8Array(item.buffer);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): EndpointResponsePacket {
        const reader = ByteReader.fromUint8Array(item);
        const params = ResponseParams.deserialize(reader.readString());
        const buffer = reader.readUint8Array();
        return new EndpointResponsePacket(params, buffer);
    }
}

import type { Client } from '../../client.js';
import type { Identifier } from '../../identifier.js';
import { IdentifierMap } from '../../identifier.js';
import { PacketType } from '../../network/packet/index.js';
import { ExtensionType } from '../extension.js';

import { EndpointType } from './endpoint.js';
import { EndpointDataPacket, EndpointErrorPacket, EndpointRegisterPacket } from './packets.js';

export const ENDPOINT_EXTENSION_TYPE: ExtensionType<EndpointExtension> = new ExtensionType(
    'endpoint',
    (client: Client) => new EndpointExtension(client),
);

type CallPromise = {
    resolve: (data: Uint8Array) => void;
    reject: (error: Error) => void;
};

type EndpointHandler = {
    type: EndpointType;
    handler: (arg: any) => Promise<any>;
};

export class EndpointExtension {
    public readonly type: ExtensionType<EndpointExtension> = ENDPOINT_EXTENSION_TYPE;
    private readonly registeredEndpoints = new IdentifierMap<EndpointHandler>();
    private readonly promiseMap: Map<number, CallPromise> = new Map();
    private callId: number;

    constructor(private readonly client: Client) {
        this.callId = 0;
        client.network.registerPacket(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_CALL_PACKET,
            ENDPOINT_RECEIVE_PACKET,
            ENDPOINT_ERROR_PACKET,
        );
        client.network.addPacketHandler(ENDPOINT_RECEIVE_PACKET, (event) => {
            const promise = this.promiseMap.get(event.key);
            if (!promise) {
                throw new Error(
                    `Received response for unknown key ${event.key} (${event.id.key()})`,
                );
            }
            this.promiseMap.delete(event.key);
            promise.resolve(event.data);
        });
        client.network.addPacketHandler(ENDPOINT_ERROR_PACKET, (event) => {
            const promise = this.promiseMap.get(event.key);
            if (!promise) {
                throw new Error(
                    `Received error for unknown key ${event.key} (${event.id.key()})`,
                );
            }
            this.promiseMap.delete(event.key);
            promise.reject(new Error(event.error));
        });
        client.network.addTask(() => this.onTask());
    }

    private onTask(): void {
        const endpoints = new IdentifierMap<Identifier | undefined>();
        for (const [key, endpoint] of this.registeredEndpoints) {
            endpoints.set(key, endpoint.type.permissionId);
        }
        const packet = new EndpointRegisterPacket(endpoints);
        this.client.send(ENDPOINT_REGISTER_PACKET, packet);
    }

    public register<Req, Res>(
        type: EndpointType<Req, Res>,
        handler: (data: Req) => Promise<Res>,
    ): void {
        if (this.client.running) {
            throw new Error('Cannot register endpoints after the client has started');
        }
        if (this.registeredEndpoints.has(type.id)) {
            throw new Error(`Endpoint for key ${type.id} already registered`);
        }
        this.registeredEndpoints.set(type.id, { type, handler });
    }

    public listen<Req, Res>(handler: (data: Req) => Promise<Res>, name?: string): void {
        const type = EndpointType.createJson<Req, Res>(this.client.app.id, {
            name: name ?? handler.name,
        });
        this.register(type, handler);
    }

    public async call<Req, Res>(endpoint: EndpointType<Req, Res>, data: Req): Promise<Res> {
        const key = this.callId++;
        const promise = new Promise<Uint8Array>((resolve, reject) => {
            this.promiseMap.set(key, { resolve, reject });
        });
        this.client.send(ENDPOINT_CALL_PACKET, {
            id: endpoint.id,
            key,
            data: endpoint.requestSerializer.serialize(data),
        });
        const response = await promise;
        return endpoint.responseSerializer.deserialize(response);
    }
}

const ENDPOINT_REGISTER_PACKET = PacketType.createSerialized<EndpointRegisterPacket>(
    ENDPOINT_EXTENSION_TYPE,
    {
        name: 'register',
        serializer: EndpointRegisterPacket,
    },
);
const ENDPOINT_CALL_PACKET = PacketType.createSerialized<EndpointDataPacket>(
    ENDPOINT_EXTENSION_TYPE,
    {
        name: 'call',
        serializer: EndpointDataPacket,
    },
);
const ENDPOINT_RECEIVE_PACKET = PacketType.createSerialized<EndpointDataPacket>(
    ENDPOINT_EXTENSION_TYPE,
    {
        name: 'receive',
        serializer: EndpointDataPacket,
    },
);
const ENDPOINT_ERROR_PACKET = PacketType.createSerialized<EndpointErrorPacket>(
    ENDPOINT_EXTENSION_TYPE,
    {
        name: 'error',
        serializer: EndpointErrorPacket,
    },
);

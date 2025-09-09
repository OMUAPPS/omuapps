import type { Client } from '../../client.js';
import type { Identifier } from '../../identifier';
import { IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet';
import { ExtensionType } from '../extension.js';

import { EndpointType } from './endpoint.js';
import { EndpointInvokedPacket, EndpointInvokePacket, EndpointRegisterPacket, EndpointResponsePacket, InvokedParams, InvokeParams, ResponseParams } from './packets.js';

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
    handler: (packet: EndpointInvokedPacket) => Promise<Uint8Array>;
};

export class EndpointExtension {
    public readonly type: ExtensionType<EndpointExtension> = ENDPOINT_EXTENSION_TYPE;
    private readonly boundEndpoints = new IdentifierMap<EndpointHandler>();
    private readonly responsePromises: Map<number, CallPromise> = new Map();
    private callId: number;

    constructor(private readonly client: Client) {
        this.callId = Math.floor((performance.timeOrigin + performance.now()) * 1000);
        client.network.registerPacket(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_INVOKE_PACKET,
            ENDPOINT_INVOKED_PACKET,
            ENDPOINT_RESPONSE_PACKET,
        );
        client.network.addPacketHandler(ENDPOINT_INVOKED_PACKET, async (packet) => {
            const endpoint = this.boundEndpoints.get(packet.params.id);
            if (!endpoint) {
                throw new Error(`Received invocation for unknown endpoint ${packet.params.id.key()} (${packet.params.key})`);
            }
            try {
                const result = await endpoint.handler(packet);
                client.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                    new ResponseParams(packet.params.id, packet.params.key, null),
                    result,
                ));
            } catch (error) {
                client.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                    new ResponseParams(packet.params.id, packet.params.key, JSON.stringify(error)),
                    new Uint8Array(),
                ));
            }
        });
        client.network.addPacketHandler(ENDPOINT_RESPONSE_PACKET, (packet) => {
            const promise = this.responsePromises.get(packet.params.key);
            if (!promise) {
                throw new Error(
                    `Received response for unknown key ${packet.params.key} (${packet.params.id.key()})`,
                );
            }
            this.responsePromises.delete(packet.params.key);
            if (packet.params.error) {
                promise.reject(new Error(packet.params.error));
                return;
            }
            promise.resolve(packet.buffer);
        });
        client.network.addTask(() => this.onTask());
    }

    private onTask(): void {
        const endpoints = new IdentifierMap<Identifier | undefined>();
        for (const [key, endpoint] of this.boundEndpoints) {
            endpoints.set(key, endpoint.type.permissionId);
        }
        const packet = new EndpointRegisterPacket(endpoints);
        this.client.send(ENDPOINT_REGISTER_PACKET, packet);
    }

    public bind<Req, Res>(
        type: EndpointType<Req, Res>,
        handler: (data: Req, params: InvokedParams) => Promise<Res>,
    ): void {
        if (this.client.running) {
            throw new Error('Cannot register endpoints after the client has started');
        }
        if (this.boundEndpoints.has(type.id)) {
            throw new Error(`Endpoint with id ${type.id.key()} is already registered`);
        }
        this.boundEndpoints.set(type.id, { type, handler: async ({ buffer, params }) => {
            const req = type.requestSerializer.deserialize(buffer);
            const result = await handler(req, params);
            return type.responseSerializer.serialize(result);
        } });
    }

    public async call<Req, Res>(endpoint: EndpointType<Req, Res>, data: Req): Promise<Res> {
        const key = this.callId++;
        const promise = new Promise<Uint8Array>((resolve, reject) => {
            this.responsePromises.set(key, { resolve, reject });
        });
        this.client.send(ENDPOINT_INVOKE_PACKET, new EndpointInvokePacket(
            new InvokeParams(endpoint.id, key),
            endpoint.requestSerializer.serialize(data),
        ));
        const response = await promise;
        return endpoint.responseSerializer.deserialize(response);
    }
}

const ENDPOINT_REGISTER_PACKET = PacketType.createSerialized<EndpointRegisterPacket>(ENDPOINT_EXTENSION_TYPE, {
    name: 'register',
    serializer: EndpointRegisterPacket,
});
const ENDPOINT_INVOKE_PACKET = PacketType.createSerialized<EndpointInvokePacket>(ENDPOINT_EXTENSION_TYPE, {
    name: 'invoke',
    serializer: EndpointInvokePacket,
});
const ENDPOINT_INVOKED_PACKET = PacketType.createSerialized<EndpointInvokedPacket>(ENDPOINT_EXTENSION_TYPE, {
    name: 'invoked',
    serializer: EndpointInvokedPacket,
});
const ENDPOINT_RESPONSE_PACKET = PacketType.createSerialized<EndpointResponsePacket>(ENDPOINT_EXTENSION_TYPE, {
    name: 'response',
    serializer: EndpointResponsePacket,
});

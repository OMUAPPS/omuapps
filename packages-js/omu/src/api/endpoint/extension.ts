import type { Identifier } from '../../identifier';
import { IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { ExtensionType } from '../extension.js';

import { EndpointType } from './endpoint.js';
import { EndpointInvokedPacket, EndpointInvokePacket, EndpointRegisterPacket, EndpointResponsePacket, InvokedParams, InvokeParams, ResponseParams } from './packets.js';

export const ENDPOINT_EXTENSION_TYPE: ExtensionType<EndpointExtension> = new ExtensionType(
    'endpoint',
    (omu: Omu) => new EndpointExtension(omu),
);

type CallPromise = {
    resolve: (data: Uint8Array) => void;
    reject: (error: Error) => void;
    timeout?: ReturnType<typeof setTimeout>;
};

export type EndpointCallOptions = {
    /**
     * Timeout in milliseconds. Set to null to disable the timeout.
     * @default 30000
     */
    timeout?: number | null;
};

const DEFAULT_CALL_TIMEOUT = 30_000;

type EndpointHandler = {
    type: EndpointType;
    handler: (packet: EndpointInvokedPacket) => Promise<Uint8Array>;
};

export class EndpointExtension {
    public readonly type: ExtensionType<EndpointExtension> = ENDPOINT_EXTENSION_TYPE;
    private readonly boundEndpoints = new IdentifierMap<EndpointHandler>();
    private readonly responsePromises: Map<number, CallPromise> = new Map();
    private callId: number;

    constructor(private readonly omu: Omu) {
        this.callId = Math.floor((performance.timeOrigin + performance.now()) * 1000);
        omu.network.registerPacket(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_INVOKE_PACKET,
            ENDPOINT_INVOKED_PACKET,
            ENDPOINT_RESPONSE_PACKET,
        );
        omu.network.addPacketHandler(ENDPOINT_INVOKED_PACKET, (packet) => {
            this.handleInvoked(packet);
        });
        omu.network.addPacketHandler(ENDPOINT_RESPONSE_PACKET, (packet) => {
            const promise = this.responsePromises.get(packet.params.key);
            if (!promise) {
                throw new Error(
                    `Received response for unknown key ${packet.params.key} (${packet.params.id.key()})`,
                );
            }
            this.responsePromises.delete(packet.params.key);
            clearCallTimeout(promise);
            if (packet.params.error) {
                promise.reject(new Error(packet.params.error));
                return;
            }
            promise.resolve(packet.buffer);
        });
        omu.network.addTask(() => this.onTask());
        omu.network.on('disconnected', (reason) => {
            this.rejectPendingCalls(
                reason ?? new Error('Disconnected before endpoint responded'),
            );
        });
    }

    private async handleInvoked(packet: EndpointInvokedPacket): Promise<void> {
        const endpoint = this.boundEndpoints.get(packet.params.id);
        if (!endpoint) {
            throw new Error(`Received invocation for unknown endpoint ${packet.params.id.key()} (${packet.params.key})`);
        }
        try {
            const result = await endpoint.handler(packet);
            await this.omu.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                new ResponseParams(packet.params.id, packet.params.key, null),
                result,
            ));
        } catch (error) {
            await this.omu.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                new ResponseParams(packet.params.id, packet.params.key, formatError(error)),
                new Uint8Array(),
            ));
        }
    }

    private onTask(): void {
        const endpoints = new IdentifierMap<Identifier | undefined>();
        for (const [key, endpoint] of this.boundEndpoints) {
            endpoints.set(key, endpoint.type.permissionId);
        }
        const packet = new EndpointRegisterPacket(endpoints);
        this.omu.send(ENDPOINT_REGISTER_PACKET, packet);
    }

    public bind<Req, Res>(
        type: EndpointType<Req, Res>,
        handler: (data: Req, params: InvokedParams) => Promise<Res>,
    ): void {
        if (this.omu.running) {
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

    public async call<Req, Res>(
        endpoint: EndpointType<Req, Res>,
        data: Req,
        options?: EndpointCallOptions,
    ): Promise<Res> {
        const key = this.callId++;
        const timeoutMs = options?.timeout === undefined
            ? DEFAULT_CALL_TIMEOUT
            : options.timeout;
        if (
            timeoutMs !== null
            && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
        ) {
            throw new RangeError(
                'Endpoint timeout must be a positive finite number or null',
            );
        }
        const promise = new Promise<Uint8Array>((resolve, reject) => {
            const timeout = timeoutMs === null
                ? undefined
                : setTimeout(() => {
                    this.responsePromises.delete(key);
                    reject(new Error(
                        `Endpoint ${endpoint.id.key()} timed out after ${timeoutMs}ms`,
                    ));
                }, timeoutMs);
            this.responsePromises.set(key, { resolve, reject, timeout });
        });
        try {
            await this.omu.send(ENDPOINT_INVOKE_PACKET, new EndpointInvokePacket(
                new InvokeParams(endpoint.id, key),
                endpoint.requestSerializer.serialize(data),
            ));
            const response = await promise;
            return endpoint.responseSerializer.deserialize(response);
        } catch (error) {
            const pending = this.responsePromises.get(key);
            if (pending) {
                clearCallTimeout(pending);
                this.responsePromises.delete(key);
            }
            throw error;
        }
    }

    private rejectPendingCalls(error: Error): void {
        for (const promise of this.responsePromises.values()) {
            clearCallTimeout(promise);
            promise.reject(error);
        }
        this.responsePromises.clear();
    }
}

function clearCallTimeout(promise: CallPromise): void {
    if (promise.timeout !== undefined) {
        clearTimeout(promise.timeout);
    }
}

function formatError(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
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

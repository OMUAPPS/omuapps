import { Identifier, PermissionDenied } from '@omujs/omu';
import {
    ENDPOINT_INVOKE_PACKET,
    ENDPOINT_INVOKED_PACKET,
    ENDPOINT_REGISTER_PACKET,
    ENDPOINT_RESPONSE_PACKET,
    EndpointInvokedPacket,
    type EndpointInvokePacket,
    type EndpointRegisterPacket,
    EndpointResponsePacket,
    type EndpointType,
    InvokedParams,
    ResponseParams,
} from '@omujs/omu/api/endpoint';
import { DisconnectType } from '@omujs/omu/network';

import type { PacketDispatcher, Session } from '../../session';

export type EndpointHandler<Req, Res> = (session: Session, request: Req) => Promise<Res> | Res;

type Invocation = {
    id: Identifier;
    caller: Session;
    callerKey: number;
    relayKey: number;
    buffer: Uint8Array;
};

interface Endpoint {
    readonly id: Identifier;
    readonly permission: Identifier | undefined;
    call(invocation: Invocation): Promise<Session | undefined>;
}

class SessionEndpoint implements Endpoint {
    public constructor(
        private readonly session: Session,
        public readonly id: Identifier,
        public readonly permission: Identifier | undefined,
    ) {}

    public async call(invocation: Invocation): Promise<Session> {
        if (this.session.closed) throw new Error(`Session ${this.session.app.id.key()} already closed`);
        await this.session.send(ENDPOINT_INVOKED_PACKET, new EndpointInvokedPacket(
            new InvokedParams(invocation.id, invocation.caller.app.id, invocation.relayKey),
            invocation.buffer,
        ));
        return this.session;
    }
}

class ServerEndpoint<Req, Res> implements Endpoint {
    public constructor(
        private readonly type: EndpointType<Req, Res>,
        private readonly handler: EndpointHandler<Req, Res>,
    ) {}

    public get id(): Identifier {
        return this.type.id;
    }

    public get permission(): Identifier | undefined {
        return this.type.permissionId;
    }

    public async call(invocation: Invocation): Promise<undefined> {
        const { caller, callerKey } = invocation;
        try {
            const request = this.type.requestSerializer.deserialize(invocation.buffer);
            const response = await this.handler(caller, request);
            await caller.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                new ResponseParams(this.id, callerKey, null),
                this.type.responseSerializer.serialize(response),
            ));
        } catch (error) {
            await caller.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                new ResponseParams(this.id, callerKey, ServerEndpoint.describe(error)),
                new Uint8Array(),
            ));
            throw error;
        }
        return;
    }

    private static describe(error: unknown): string {
        if (error instanceof Error) return `${error.name}: ${error.message}`;
        return String(error);
    }
}

type PendingInvocation = {
    caller: Session;
    callee: Session;
    callerKey: number;
};

export class EndpointExtension {
    private readonly endpoints = new Map<string, Endpoint>();
    private readonly pending = new Map<number, PendingInvocation>();
    private nextRelayKey = 0;

    public constructor(dispatcher: PacketDispatcher) {
        dispatcher.register(ENDPOINT_REGISTER_PACKET, ENDPOINT_INVOKE_PACKET, ENDPOINT_INVOKED_PACKET, ENDPOINT_RESPONSE_PACKET);
        dispatcher.bind(ENDPOINT_REGISTER_PACKET, (session, packet) => this.handleRegister(session, packet));
        dispatcher.bind(ENDPOINT_INVOKE_PACKET, (session, packet) => this.handleInvoke(session, packet));
        dispatcher.bind(ENDPOINT_RESPONSE_PACKET, (session, packet) => this.handleResponse(session, packet));
    }

    public bind<Req, Res>(type: EndpointType<Req, Res>, handler: EndpointHandler<Req, Res>): void {
        if (this.endpoints.has(type.id.key())) throw new Error(`Endpoint ${type.id.key()} already bound`);
        this.endpoints.set(type.id.key(), new ServerEndpoint(type, handler));
    }

    private handleRegister(session: Session, packet: EndpointRegisterPacket): void {
        for (const [id, permission] of packet.endpoints) {
            if (!EndpointExtension.canBind(session, id)) {
                throw new PermissionDenied(`App ${session.app.id.key()} not allowed to register endpoint ${id.key()}`);
            }
            this.endpoints.set(id.key(), new SessionEndpoint(session, id, permission));
        }
    }

    private async handleInvoke(session: Session, packet: EndpointInvokePacket): Promise<void> {
        const { id, key } = packet.params;
        const endpoint = this.endpoints.get(id.key());
        if (!endpoint) {
            console.warn(`${session.app.id.key()} tried to call unknown endpoint ${id.key()}`);
            await session.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
                new ResponseParams(id, key, `Endpoint ${id.key()} not found`),
                new Uint8Array(),
            ));
            return;
        }
        EndpointExtension.verifyPermission(endpoint, session);
        const relayKey = this.nextRelayKey++;
        const callee = await endpoint.call({ id, caller: session, callerKey: key, relayKey, buffer: packet.buffer });
        if (!callee) return;
        this.pending.set(relayKey, { caller: session, callee, callerKey: key });
    }

    private async handleResponse(session: Session, packet: EndpointResponsePacket): Promise<void> {
        const { id, key, error } = packet.params;
        const pending = this.pending.get(key);
        if (!pending) {
            console.warn(`${session.app.id.key()} tried to handle response for unknown call ${key} (${id.key()})`);
            return;
        }
        if (pending.callee !== session) {
            await session.disconnect(
                DisconnectType.PERMISSION_DENIED,
                `Session mismatch for call ${key} (${id.key()}): ${session.app.id.key()} != ${pending.callee.app.id.key()}`,
            );
            return;
        }
        this.pending.delete(key);
        await pending.caller.send(ENDPOINT_RESPONSE_PACKET, new EndpointResponsePacket(
            new ResponseParams(id, pending.callerKey, error),
            packet.buffer,
        ));
    }

    private static canBind(session: Session, id: Identifier): boolean {
        if (id.isSubpathOf(session.app.id)) return true;
        return session.role.managesDashboard && id.namespace === 'ext';
    }

    private static verifyPermission(endpoint: Endpoint, session: Session): void {
        if (session.isAppId(endpoint.id)) return;
        if (endpoint.permission && session.permissions.has(endpoint.permission)) return;
        const message = `${session.app.id.key()} tried to call endpoint ${endpoint.id.key()} without permission ${endpoint.permission?.key()}`;
        console.warn(message);
        throw new PermissionDenied(message);
    }
}

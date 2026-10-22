import { DisconnectType, PACKET_TYPES } from '@omujs/omu/network';

import type { SocketAcceptor, SocketChannel, SocketRequest } from '../network';
import type { ConnectionVerifier } from '../security';

import type { LocalConnectionHost } from './local-pipe.js';
import type { PacketDispatcher } from './packet-dispatcher.js';
import type { Session } from './session.js';
import type { SessionAcceptor } from './session-acceptor.js';
import { FramedConnection, type SessionConnection } from './session-connection.js';

export interface SessionHost {
    host(session: Session): Promise<void>;
}

export class SessionGateway implements SocketAcceptor, LocalConnectionHost {
    public constructor(
        private readonly acceptor: SessionAcceptor,
        private readonly verifier: ConnectionVerifier,
        private readonly dispatcher: PacketDispatcher,
        private readonly sessions: SessionHost,
    ) {
        dispatcher.register(PACKET_TYPES.CONNECT, PACKET_TYPES.READY, PACKET_TYPES.DISCONNECT, PACKET_TYPES.ENCRYPTED_PACKET);
        dispatcher.bind(PACKET_TYPES.READY, (session) => this.handleReady(session));
        dispatcher.bind(PACKET_TYPES.DISCONNECT, (session, packet) => session.disconnect(DisconnectType.CLOSE, packet.message ?? undefined));
    }

    public async accept(channel: SocketChannel, request: SocketRequest): Promise<void> {
        const accepted = await this.acceptor.accept(new FramedConnection(channel));
        if (!accepted) return;
        const { session, token } = accepted;
        const reason = this.verifier.verify(session.app, request);
        if (reason) {
            console.warn(`Verification failed for ${session.app.id.key()}: ${reason.message}`);
            await session.disconnect(reason.type, reason.message);
            return;
        }
        if (session.role.receivesToken) {
            await session.send(PACKET_TYPES.TOKEN, token);
        }
        await this.sessions.host(session);
    }

    public async attach(connection: SessionConnection): Promise<void> {
        const accepted = await this.acceptor.accept(connection);
        if (!accepted) return;
        await this.sessions.host(accepted.session);
    }

    private async handleReady(session: Session): Promise<void> {
        if (!await session.processReadyTasks()) return;
        if (session.closed) return;
        await session.send(PACKET_TYPES.READY, null);
        const version = session.app.version ? ` v${session.app.version}` : '';
        console.info(`Ready: ${session.app.id.key()}${version}`);
    }
}

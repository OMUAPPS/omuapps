import { Identifier, type IntoId, PermissionDenied } from '@omujs/omu';
import {
    SIGNAL_LISTEN_PACKET,
    SIGNAL_NOTIFY_PACKET,
    SIGNAL_REGISTER_PACKET,
    SignalPacket,
    type SignalPermissions,
    type SignalRegisterPacket,
} from '@omujs/omu/api/signal';
import type { Unlisten } from '@omujs/omu/event';

import type { PacketDispatcher, Session } from '../../session';

type Scope = (permissions: SignalPermissions) => (IntoId | undefined)[];

class ServerSignal {
    public permissions: SignalPermissions = {};
    private readonly listeners = new Map<Session, Unlisten>();

    public constructor(public readonly id: Identifier) {}

    public async notify(body: Uint8Array): Promise<void> {
        const packet = new SignalPacket(this.id, body);
        for (const session of this.listeners.keys()) {
            await session.send(SIGNAL_NOTIFY_PACKET, packet);
        }
    }

    public attach(session: Session): void {
        if (this.listeners.has(session)) throw new Error('Session already attached');
        this.listeners.set(session, session.disconnected.listen(() => this.detach(session)));
    }

    private detach(session: Session): void {
        this.listeners.get(session)?.();
        this.listeners.delete(session);
    }
}

export class SignalExtension {
    private readonly signals = new Map<string, ServerSignal>();

    public constructor(dispatcher: PacketDispatcher) {
        dispatcher.register(SIGNAL_REGISTER_PACKET, SIGNAL_LISTEN_PACKET, SIGNAL_NOTIFY_PACKET);
        dispatcher.bind(SIGNAL_REGISTER_PACKET, (session, packet) => this.handleRegister(session, packet));
        dispatcher.bind(SIGNAL_LISTEN_PACKET, (session, id) => this.verified(session, id, (p) => [p.all, p.listen]).attach(session));
        dispatcher.bind(SIGNAL_NOTIFY_PACKET, (session, packet) => this.verified(session, packet.id, (p) => [p.all, p.send]).notify(packet.body));
    }

    private signal(id: Identifier): ServerSignal {
        const existing = this.signals.get(id.key());
        if (existing) return existing;
        const signal = new ServerSignal(id);
        this.signals.set(id.key(), signal);
        return signal;
    }

    private handleRegister(session: Session, packet: SignalRegisterPacket): void {
        if (!packet.id.isSubpathOf(session.app.id)) throw new PermissionDenied('App not allowed to register signal');
        this.signal(packet.id).permissions = packet.permissions;
    }

    private verified(session: Session, id: Identifier, scope: Scope): ServerSignal {
        const signal = this.signal(id);
        if (session.isAppId(signal.id)) return signal;
        for (const permission of scope(signal.permissions)) {
            if (permission && session.permissions.has(Identifier.from(permission))) return signal;
        }
        throw new PermissionDenied(`App ${session.app.id.key()} not allowed to access ${signal.id.key()}`);
    }
}

import type { Identifier } from '@omujs/omu';
import { LOGGER_LISTEN_PACKET, LOGGER_LOG_PACKET, LOGGER_LOG_PERMISSION_ID, type LogPacket } from '@omujs/omu/api/logger';
import { PermissionType } from '@omujs/omu/api/permission';

import type { PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';

export class LoggerExtension {
    private static readonly PERMISSION = new PermissionType({
        id: LOGGER_LOG_PERMISSION_ID,
        metadata: {
            level: 'low',
            name: { ja: 'アプリの動作記録を保存', en: 'Save app operation records' },
            note: { ja: '不具合などの調査のために使われます', en: 'Used for investigation of problems' },
        },
    });

    private readonly listeners = new Map<string, Set<Session>>();

    public constructor(dispatcher: PacketDispatcher, security: PermissionManager) {
        security.registerPermission(LoggerExtension.PERMISSION);
        dispatcher.register(LOGGER_LOG_PACKET, LOGGER_LISTEN_PACKET);
        dispatcher.bind(LOGGER_LOG_PACKET, (session, packet) => this.handleLog(session, packet));
        dispatcher.bind(LOGGER_LISTEN_PACKET, (session, id) => this.handleListen(session, id));
    }

    private handleLog(session: Session, packet: LogPacket): void {
        session.permissions.require(LOGGER_LOG_PERMISSION_ID, 'You do not have permission to log');
        console.info(`${packet.id.key()}: ${packet.message.type} ${packet.message.text}`);
    }

    private handleListen(session: Session, id: Identifier): void {
        session.permissions.require(LOGGER_LOG_PERMISSION_ID, 'You do not have permission to listen to logs');
        const listeners = this.listeners.get(id.key()) ?? new Set();
        listeners.add(session);
        this.listeners.set(id.key(), listeners);
        session.disconnected.listen(() => listeners.delete(session));
    }
}

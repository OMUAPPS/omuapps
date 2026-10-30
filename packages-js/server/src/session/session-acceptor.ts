import { VERSION } from '@omujs/omu';
import {
    AES,
    type ConnectPacket,
    type Decryptor,
    DisconnectPacket,
    DisconnectType,
    PACKET_TYPES,
    type PacketMapper,
    type ServerMeta,
} from '@omujs/omu/network';

import type { PermissionManager } from '../security';

import { DecryptorGenerator } from './decryptor-generator.js';
import { Session } from './session.js';
import type { SessionConnection } from './session-connection.js';

export type AcceptedSession = {
    session: Session;
    token: string;
};

export class SessionAcceptor {
    private static readonly BRAND = 'Official server implementation by omuapps.com';
    private readonly decryptor: Promise<Decryptor> = DecryptorGenerator.generate();

    public constructor(
        private readonly manager: PermissionManager,
        private readonly mapper: PacketMapper,
        private readonly hash: string | undefined,
    ) {}

    public async accept(connection: SessionConnection): Promise<AcceptedSession | undefined> {
        const decryptor = await this.decryptor;
        const meta: ServerMeta & { protocol: { brand: string } } = {
            protocol: { version: VERSION, brand: SessionAcceptor.BRAND },
            encryption: { kind: 'v1', rsa: await decryptor.toRequest() },
            hash: this.hash,
        };
        await connection.send(PACKET_TYPES.SERVER_META.new(meta), this.mapper);
        const connect = await this.receiveConnect(connection);
        if (!connect) return;
        let token = connect.token;
        let aes: AES | undefined;
        if (connect.encryption) {
            aes = await AES.deserialize(connect.encryption.aes, decryptor);
            if (token) {
                token = await decryptor.decryptString(token);
            }
        }
        const verification = await this.manager.verifyApp(connect.app, token);
        if (!verification.ok) {
            await this.reject(connection, DisconnectType.INVALID_TOKEN, verification.reason);
            console.warn(`Invalid token for ${connect.app.id.key()}: ${verification.reason}`);
            return;
        }
        return {
            session: new Session(connect.app, verification.handle, connection, this.mapper, aes),
            token: verification.token,
        };
    }

    private async receiveConnect(connection: SessionConnection): Promise<ConnectPacket | undefined> {
        try {
            const packet = await connection.receive(this.mapper);
            if (!packet) return;
            if (PACKET_TYPES.CONNECT.match(packet)) return packet.data;
            await this.reject(connection, DisconnectType.INVALID_PACKET, `Expected ${PACKET_TYPES.CONNECT.id.key()} but got ${packet.type.id.key()}`);
        } catch (error) {
            await this.reject(connection, DisconnectType.INVALID_PACKET, String(error));
        }
        return;
    }

    private async reject(connection: SessionConnection, type: DisconnectType, message: string): Promise<void> {
        await connection.send(PACKET_TYPES.DISCONNECT.new(new DisconnectPacket({ type, message })), this.mapper);
        await connection.close();
    }
}

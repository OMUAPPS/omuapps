import type { Client } from '../../client.js';
import type { Unlisten } from '../../event-emitter.js';
import { Identifier, IdentifierMap } from '../../identifier.js';
import { PacketType } from '../../network/packet/packet.js';
import { ExtensionType } from '../extension.js';

import type { LogMessage } from './packets.js';
import { LogPacket, LogType } from './packets.js';

export const LOGGER_EXTENSION_TYPE: ExtensionType<LoggerExtension> = new ExtensionType(
    'logger',
    (client) => new LoggerExtension(client),
);

export const LOGGER_LOG_PERMISSION_ID: Identifier = LOGGER_EXTENSION_TYPE.join('log');

export const LOGGER_LOG_PACKET: PacketType<LogPacket> = PacketType.createSerialized<LogPacket>(LOGGER_EXTENSION_TYPE, {
    name: 'log',
    serializer: LogPacket,
});
export const LOGGER_LISTEN_PACKET: PacketType<Identifier> = PacketType.createJson<Identifier>(LOGGER_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Identifier,
});

type LogListener = (message: LogMessage) => void;
export class LoggerExtension {
    public readonly type: ExtensionType<LoggerExtension> = LOGGER_EXTENSION_TYPE;
    private readonly listeners: IdentifierMap<LogListener[]> = new IdentifierMap();

    constructor(private readonly client: Client) {
        client.network.registerPacket(LOGGER_LOG_PACKET, LOGGER_LISTEN_PACKET);
        client.network.addPacketHandler(LOGGER_LOG_PACKET, (packet) => {
            const listener = this.listeners.get(packet.id);
            if (listener) {
                listener.forEach((it) => it(packet.message));
            }
        });
    }

    public log(message: LogMessage): void {
        const packet = new LogPacket(this.client.app.id, message);
        this.client.send(LOGGER_LOG_PACKET, packet);
    }

    public error(text: string): void {
        this.log({ type: LogType.ERROR, text });
    }

    public warning(text: string): void {
        this.log({ type: LogType.WARNING, text });
    }

    public info(text: string): void {
        this.log({ type: LogType.INFO, text });
    }

    public debug(text: string): void {
        this.log({ type: LogType.DEBUG, text });
    }

    public listen(id: Identifier, listener: LogListener): Unlisten {
        if (!this.listeners.has(id)) {
            this.client.onReady(() => {
                this.client.send(LOGGER_LISTEN_PACKET, id);
            });
        }
        const list = this.listeners.get(id) ?? [];
        list.push(listener);
        this.listeners.set(id, list);
        return () => {
            list.splice(list.indexOf(listener), 1);
        };
    }
}

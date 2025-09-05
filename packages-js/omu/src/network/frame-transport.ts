
import type { Serializable } from '../serialize';
import { ByteReader, ByteWriter } from '../serialize';

import type { Connection, Transport } from './connection.js';
import type { Packet, PacketData } from './packet/packet.js';

const FRAME_TYPE_KEY = 'omuapps-frame';

type Command = ({
    type: 'syn',
    payload: {
        origin: string,
    }
} | {
    type: 'connect',
    payload: object,
} | {
    type: 'disconnect',
    payload: object,
} | {
    type: 'send',
    payload: Uint8Array,
} | {
    type: 'receive',
    payload: Uint8Array,
} | {
    type: 'error',
    payload: string,
}) & {
    type_key?: string,
};

export class FrameTransport implements Transport {
    public connect(): Promise<FrameConnection> {
        return FrameConnection.create();
    }
}

export class FrameConnection implements Connection {
    public connected: boolean;
    private origin: string | null = null;
    private readonly packetQueue: Array<PacketData> = [];
    private readonly sendQueue: Array<Command> = [];
    private receiveWaiter: (() => void) | null = null;
    
    constructor(
        private connectedWaiter: (() => void) | null,
    ) {
        this.connected = false;
        window.addEventListener('message', (event) => {
            if (event.data === null || typeof event.data !== 'object') {
                return;
            }
            if (!('type_key' in event.data) || event.data.type_key !== FRAME_TYPE_KEY) {
                return;
            }
            const command = event.data as Command;
            if (command.type === 'syn') {
                this.origin = event.origin;
            }
            if (event.origin !== this.origin) {
                return;
            }
            this.handleCommand(command);
        });
    }

    public static create(): Promise<FrameConnection> {
        return new Promise<FrameConnection>((resolve) => {
            const connection = new FrameConnection((): void => resolve(connection));
            connection.postCommand({
                type: 'connect',
                payload: {},
            });
        });
    }

    private handleCommand(command: Command): void {
        const { type, payload } = command;
        switch (type) {
            case 'syn':
                this.origin = payload.origin;
                this.postCommand({
                    type: 'syn',
                    payload: {
                        origin: window.origin,
                    },
                });
                break;
            case 'connect':
                this.connected = true;
                if (this.connectedWaiter) {
                    this.connectedWaiter();
                    this.connectedWaiter = null;
                }
                break;
            case 'disconnect':
                this.connected = false;
                break;
            case 'receive': {
                const reader = ByteReader.fromUint8Array(payload);
                this.packetQueue.push({
                    type: reader.readString(),
                    data: reader.readUint8Array(),
                });
                reader.finish();
                if (this.receiveWaiter) {
                    this.receiveWaiter();
                }
                break;
            }
            case 'error':
                throw new Error(payload);
            case 'send':
                break;
            default:
                throw new Error(`Unknown command type: ${type}`);
        }
    }

    private postCommand(command: Command): void {
        command.type_key = FRAME_TYPE_KEY;
        if (!this.origin) {
            this.sendQueue.push(command);
            return;
        }
        for (const queuedCommand of this.sendQueue) {
            window.parent.postMessage(queuedCommand, this.origin);
        }
        this.sendQueue.length = 0;
        window.parent.postMessage(command, this.origin);
    }

    public async receive(serializer: Serializable<Packet<unknown>, PacketData>): Promise<Packet | null> {
        if (this.receiveWaiter) {
            throw new Error('Already receiving');
        }
        if (!this.connected) {
            return null;
        }
        while (this.packetQueue.length === 0 && this.connected) {
            await new Promise<void>((resolve) => {
                this.receiveWaiter = (): void => resolve();
            });
        }
        if (!this.connected) {
            return null;
        }
        const packet = serializer.deserialize(this.packetQueue.shift()!);
        this.receiveWaiter = null;
        return packet;
    }

    get closed(): boolean {
        return !this.connected;
    }

    close(): void {
        if (this.connected) {
            this.postCommand({
                type: 'disconnect',
                payload: {},
            });
        }
        this.connected = false;
        if (this.receiveWaiter) {
            this.receiveWaiter();
            this.receiveWaiter = null;
        }
    }

    send(packet: Packet, serializer: Serializable<Packet<unknown>, PacketData>): void {
        if (!this.connected) {
            throw new Error('Not connected');
        }
        const packetData = serializer.serialize(packet);
        const writer = new ByteWriter();
        writer.writeString(packetData.type);
        writer.writeUint8Array(packetData.data);
        this.postCommand({
            type: 'send',
            payload: writer.finish(),
        });
    }
}

import type { Address } from '../address.js';
import type { Serializable } from '../serialize';
import { ByteReader, ByteWriter } from '../serialize';

import type { Connection, Transport } from './connection.js';
import type { Packet, PacketData } from './packet/packet.js';

export class WebsocketTransport implements Transport {
    constructor(
        private readonly address: Address,
    ) { }

    private get wsEndpoint(): string {
        const protocol = this.address.secure ? 'wss' : 'ws';
        const { host, port } = this.address;
        return `${protocol}://${host}:${port}/ws`;
    }

    public connect(): Promise<Connection> {
        const socket = new WebSocket(this.wsEndpoint);
        return WebsocketConnection.fromSocket(socket);
    }
}

export class WebsocketConnection implements Connection {
    private readonly packetQueue: Array<PacketData> = [];
    private receiveWaiter: (() => void) | null = null;
    private readingPromise: Promise<void> | null = null;
    private beingClosed: boolean = false;

    constructor(
        private socket: WebSocket,
    ) { }

    public static fromSocket(socket: WebSocket): Promise<WebsocketConnection> {
        const connection = new WebsocketConnection(socket);
        return new Promise((resolve, reject) => {
            socket.onerror = reject;
            socket.onclose = () => {
                connection.beingClosed = true;
                if (connection.receiveWaiter) {
                    connection.receiveWaiter();
                    connection.receiveWaiter = null;
                }
            };
            socket.onmessage = (event): void => {
                connection.readingPromise = connection.onMessage(event).finally(() => {
                    connection.readingPromise = null;
                });
            };
            socket.onopen = (): void => {
                resolve(connection);
            };
        });
    }

    private async onMessage(event: MessageEvent<string | Blob>): Promise<void> {
        if (typeof event.data === 'string') {
            throw new Error('Received string data');
        }
        const reader = await ByteReader.fromBlob(event.data);
        const data = {
            type: reader.readString(),
            data: reader.readUint8Array(),
        };
        this.packetQueue.push(data);
        reader.finish();
        if (this.receiveWaiter) {
            this.receiveWaiter();
        }
    }

    public async receive(serializer: Serializable<Packet<unknown>, PacketData>): Promise<Packet | null> {
        if (this.receiveWaiter) {
            throw new Error('Already receiving');
        }
        while (this.packetQueue.length === 0 && !this.beingClosed) {
            await new Promise<void>((resolve) => {
                this.receiveWaiter = resolve;
            });
            this.receiveWaiter = null;
        }
        if (this.packetQueue.length === 0 && this.beingClosed) {
            return null;
        }
        const packetData = this.packetQueue.shift()!;
        return serializer.deserialize(packetData);
    }

    get closed(): boolean {
        if (this.readingPromise) {
            return false;
        }
        if (this.packetQueue.length > 0) {
            return false;
        }
        if (this.receiveWaiter) {
            return false;
        }
        if (this.socket.readyState !== WebSocket.CLOSED && this.socket.readyState !== WebSocket.CLOSING) {
            return false;
        }
        return true;
    }

    close(): void {
        if (this.socket) {
            this.socket.close();
        }
        if (this.receiveWaiter) {
            this.receiveWaiter();
            this.receiveWaiter = null;
        }
    }

    send(packet: Packet, serializer: Serializable<Packet<unknown>, PacketData>): void {
        const packetData = serializer.serialize(packet);
        const writer = new ByteWriter();
        writer.writeString(packetData.type);
        writer.writeUint8Array(packetData.data);
        this.socket.send(writer.finish());
    }
}

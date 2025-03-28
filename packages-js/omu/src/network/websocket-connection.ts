
import type { Address } from '../address.js';
import { ByteReader, ByteWriter } from '../bytebuffer.js';
import type { Serializable } from '../serializer.js';

import type { Connection } from './connection.js';
import type { Packet, PacketData } from './packet/packet.js';

export class WebsocketConnection implements Connection {
    public connected: boolean;
    private socket: WebSocket | null;
    private readonly packetQueue: Array<PacketData> = [];
    private receiveWaiter: (() => void) | null = null;

    constructor(
        private readonly address: Address,
    ) {
        this.connected = false;
        this.socket = null;
    }

    private get wsEndpoint(): string {
        const protocol = this.address.secure ? 'wss' : 'ws';
        const { host, port } = this.address;
        return `${protocol}://${host}:${port}/ws`;
    }

    public connect(): Promise<void> {
        if (this.socket && !this.connected) {
            throw new Error('Already connecting');
        }
        return new Promise((resolve, reject) => {
            this.close();
            this.socket = new WebSocket(this.wsEndpoint);
            this.socket.onerror = reject;
            this.socket.onclose = (): void => { this.close(); };
            this.socket.onmessage = (event): void => { this.onMessage(event); };
            this.socket.onopen = (): void => {
                this.connected = true;
                resolve();
            };
        });
    }

    private async onMessage(event: MessageEvent<string | Blob>): Promise<void> {
        if (typeof event.data === 'string') {
            throw new Error('Received string data');
        }
        const reader = new ByteReader(await event.data.bytes());
        this.packetQueue.push({
            type: reader.readString(),
            data: reader.readByteArray(),
        });
        reader.finish();
        if (this.receiveWaiter) {
            this.receiveWaiter();
        }
    }

    public async receive(serializer: Serializable<Packet<unknown>, PacketData>): Promise<Packet | null> {
        if (this.receiveWaiter) {
            throw new Error('Already receiving');
        }
        if (!this.connected || !this.socket) {
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
        if (this.socket) {
            return this.socket.readyState === WebSocket.CLOSED;
        }
        return true;
    }

    close(): void {
        this.connected = false;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.receiveWaiter) {
            this.receiveWaiter();
            this.receiveWaiter = null;
        }
    }

    send(packet: Packet, serializer: Serializable<Packet<unknown>, PacketData>): void {
        if (!this.connected || !this.socket) {
            throw new Error('Not connected');
        }
        const packetData = serializer.serialize(packet);
        const writer = new ByteWriter();
        writer.writeString(packetData.type);
        writer.writeByteArray(packetData.data);
        this.socket.send(writer.finish());
    }
}

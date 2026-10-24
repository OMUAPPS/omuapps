import type { ServerWebSocket } from 'bun';

import type { SocketRequest } from './socket-request.js';

export type SocketMessage = Uint8Array | string;

export type SocketData = {
    channel: SocketChannel;
    request: SocketRequest;
};

export class SocketChannel {
    private socket: ServerWebSocket<SocketData> | undefined;
    private readonly queue: SocketMessage[] = [];
    private waiter: (() => void) | undefined;
    private ended = false;

    public get closed(): boolean {
        return this.ended;
    }

    public attach(socket: ServerWebSocket<SocketData>): void {
        this.socket = socket;
    }

    public push(message: string | Uint8Array): void {
        this.queue.push(typeof message === 'string' ? message : new Uint8Array(message));
        this.wake();
    }

    public end(): void {
        this.ended = true;
        this.wake();
    }

    public async receive(): Promise<SocketMessage | undefined> {
        while (this.queue.length === 0) {
            if (this.ended) return;
            await new Promise<void>((resolve) => {
                this.waiter = resolve;
            });
        }
        return this.queue.shift();
    }

    public send(data: Uint8Array): void {
        if (this.ended || !this.socket) return;
        this.socket.sendBinary(data);
    }

    public close(): void {
        if (!this.ended) {
            this.socket?.close();
        }
        this.end();
    }

    private wake(): void {
        const waiter = this.waiter;
        this.waiter = undefined;
        waiter?.();
    }
}

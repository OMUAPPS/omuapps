import { textDecoder } from '../../const';
import { DataChunk, RequestHandle } from './http';

export type WSData = string | ArrayBufferLike | Blob | ArrayBufferView;

export const WSMsgType = {
    CONTINUATION: 0x0,
    TEXT: 0x1,
    BINARY: 0x2,
    PING: 0x9,
    PONG: 0xA,
    CLOSE: 0x8,
} as const;

export const WSCloseCode = {
    OK: 1000,
    GOING_AWAY: 1001,
    PROTOCOL_ERROR: 1002,
    UNSUPPORTED_DATA: 1003,
    ABNORMAL_CLOSURE: 1006,
    INVALID_TEXT: 1007,
    POLICY_VIOLATION: 1008,
    MESSAGE_TOO_BIG: 1009,
    MANDATORY_EXTENSION: 1010,
    INTERNAL_ERROR: 1011,
    SERVICE_RESTART: 1012,
    TRY_AGAIN_LATER: 1013,
    BAD_GATEWAY: 1014,
} as const;

export type WebSocketOpen = RequestHandle & {
    url: string;
    protocol?: string | null;
};
export type WebSocketClose = RequestHandle & {
    code?: number;
    reason?: string | null;
};
export type WebSocketError = RequestHandle & {
    type: 'ConnectionRefused';
    reason?: string | null;
};

export type EventListenerMap<T> = {
    [K in keyof T]: ((event: T[K]) => unknown)[]
};

export type WSMsg = {
    type: 'open';
    data: WebSocketOpen;
} | {
    type: 'error';
    data: WebSocketError;
} | {
    type: 'text';
    data: string;
} | {
    type: 'binary';
    data: Uint8Array;
} | {
    type: 'close';
    data: WebSocketClose;
};

export type WebSocketHandle = {
    ws: OmuWS;
    open: (response: WebSocketOpen) => void;
    dispatch: (data: DataChunk<WSDataMeta>) => void;
    close: (response: WebSocketClose) => void;
    error: (response: WebSocketError) => void;
};

export type WSDataMeta = {
    id: string;
    type:
        | typeof WSMsgType.TEXT
        | typeof WSMsgType.BINARY
        | typeof WSMsgType.PING
        | typeof WSMsgType.PONG;
};

export type WSHandleState = {
    type: 'created' | 'receiving';
    handle: WebSocketHandle;
};

type WSOptions = {
    addQueue: (data: WSData) => void;
    dispose(options: {
        code?: number;
        reason?: string;
    }): void;
};

export class OmuWS {
    constructor(
        protected readonly addQueue: (data: WSData) => void,
        protected readonly dispose: (options: { code?: number; reason?: string }) => void,
        protected readonly receiveQueue: WSMsg[] = [],
        private receiveResolve: (() => void) | undefined = undefined,
        private status: 'connecting' | 'open' | 'closed' = 'connecting',
    ) { }

    public toWebSocket(): OmuWebSocket {
        return new OmuWebSocket(this);
    }

    public static create(options: WSOptions): WebSocketHandle {
        const ws = new OmuWS(options.addQueue, options.dispose);
        return {
            ws,
            open: (response) => {
                ws.receiveQueue.push({
                    type: 'open',
                    data: response,
                });
                ws.receiveResolve?.();
            },
            dispatch: (data: DataChunk<WSDataMeta>): void => {
                if (data.meta.type === WSMsgType.BINARY) {
                    ws.receiveQueue.push({
                        type: 'binary',
                        data: data.body,
                    });
                } else {
                    ws.receiveQueue.push({
                        type: 'text',
                        data: textDecoder.decode(data.body),
                    });
                }
                ws.receiveResolve?.();
            },
            close: (response) => {
                ws.receiveQueue.push({
                    type: 'close',
                    data: response,
                });
                ws.receiveResolve?.();
            },
            error: (response) => {
                ws.receiveQueue.push({
                    type: 'error',
                    data: response,
                });
                ws.receiveResolve?.();
            },
        };
    }

    public send(data: WSData): void {
        this.addQueue(data);
    }

    public close(code?: number, reason?: string): void {
        this.dispose({ code, reason });
    }

    public async receive(): Promise<WSMsg> {
        if (this.receiveResolve) {
            throw new Error('Already receiving from another async call');
        }
        while (this.status !== 'closed') {
            const data = this.receiveQueue.shift();
            if (!data) {
                await new Promise<void>((resolve) => this.receiveResolve = resolve);
                continue;
            }
            if (data.type === 'close') {
                this.status = 'closed';
            }
            if (data.type === 'open') {
                this.status = 'open';
            }
            this.receiveResolve = undefined;
            return data;
        }
        throw new Error('Receiving on already closed socket');
    }

    protocol: string = '';
    url: string = '';
}

export class OmuWebSocket implements WebSocket {
    public CONNECTING = 0 as const;
    public OPEN = 1 as const;
    public CLOSING = 2 as const;
    public CLOSED = 3 as const;

    binaryType: BinaryType = 'blob';
    bufferedAmount: number = 0;
    extensions: string = '';
    onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
    onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
    onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
    protocol: string = '';
    readyState: 0 | 2 | 1 | 3 = 0;
    url: string = '';

    constructor(
        protected readonly ws: OmuWS,
        private readonly eventListeners: EventListenerMap<WebSocketEventMap> = {
            close: [],
            error: [],
            message: [],
            open: [],
        },
    ) {
        this.receiveLoop();
    }

    private async receiveLoop() {
        while (this.readyState === WebSocket.CLOSED) {
            const { data, type } = await this.ws.receive();
            switch (type) {
                case 'close':
                    this.dispatchEvent(new CloseEvent('close', {
                        code: data.code,
                        reason: data.reason ?? undefined,
                    }));
                    break;
                case 'open':
                    this.url = data.url;
                    this.protocol = data.protocol ?? '';
                    this.dispatchEvent(new Event('open', {}));
                    break;
                case 'error':
                    this.dispatchEvent(new ErrorEvent('error', {
                        error: data.type,
                        message: data.reason ?? undefined,
                    }));
                    break;
                case 'text':
                case 'binary':
                    this.dispatchEvent(new MessageEvent('message', {
                        data,
                    }));
                    break;
            }
        }
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this.eventListeners[event.type];
        for (const listener of listeners) {
            listener(event);
        }
        if (event.type === 'open') {
            this.onopen?.(event as MessageEvent);
        }
        if (event.type === 'error') {
            this.onerror?.(event);
        }
        if (event.type === 'message') {
            this.onmessage?.(event as MessageEvent);
        }
        if (event.type === 'close') {
            this.onclose?.(event as CloseEvent);
        }
        return true;
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.ws.send(data);
    }

    close(code?: number, reason?: string): void {
        this.ws.close(code, reason);
    }

    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => unknown): void {
        this.eventListeners[type].push(listener);
    }

    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => unknown): void {
        const listeners = this.eventListeners[type];
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
}

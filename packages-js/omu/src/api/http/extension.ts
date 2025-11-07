/* eslint-disable @typescript-eslint/no-explicit-any */
import { textDecoder, textEncoder } from '../../const';
import { Identifier } from '../../identifier';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { ByteReader, ByteWriter, JsonType } from '../../serialize';
import { Extension, ExtensionType } from '../extension';

export const HTTP_EXTENSION_TYPE: ExtensionType<HttpExtension> = new ExtensionType(
    'http',
    (omu: Omu) => new HttpExtension(omu),
);

export const HTTP_REQUEST_PERMISSION_ID: Identifier = HTTP_EXTENSION_TYPE.join('request');

type RequestHandle = {
    id: string;
};

type HttpRequest = RequestHandle & {
    header: Record<string, string>;
    method: string;
    redirect: RequestRedirect;
    url: string;
};

const REQUEST_CREATE = PacketType.createJson<HttpRequest>(HTTP_EXTENSION_TYPE, {
    name: 'request_create',
});

class DataChunk<T extends JsonType> {
    constructor(
        public readonly meta: T,
        public readonly body: Uint8Array,
    ) { }

    public static serialize<T extends JsonType>(data: DataChunk<T>): Uint8Array {
        const writer = new ByteWriter();
        writer.writeJSON(data.meta);
        writer.writeUint8Array(data.body);
        return writer.finish();
    }

    public static deserialize<T extends JsonType>(data: Uint8Array): DataChunk<T> {
        const reader = ByteReader.fromUint8Array(data);
        const meta = reader.readJSON<T>();
        const body = reader.readUint8Array();
        return new DataChunk(meta, body);
    }
}

const REQUEST_SEND = PacketType.createSerialized<DataChunk<RequestHandle>>(HTTP_EXTENSION_TYPE, {
    name: 'request_send',
    serializer: DataChunk,
});

type HttpRequestClose = RequestHandle;

const REQUEST_CLOSE = PacketType.createJson<HttpRequestClose>(HTTP_EXTENSION_TYPE, {
    name: 'request_close',
});

type HttpResponse = RequestHandle & {
    header: Record<string, string>;
    status: number;
    statusText: string;
    url: string;
    history: HttpResponse[];
    redirected: boolean;
};

const RESPONSE_CREATE = PacketType.createJson<HttpResponse>(HTTP_EXTENSION_TYPE, {
    name: 'response_create',
});

const RESPONSE_CHUNK = PacketType.createSerialized<DataChunk<RequestHandle>>(HTTP_EXTENSION_TYPE, {
    name: 'response_chunk',
    serializer: DataChunk,
});

const RESPONSE_CLOSE = PacketType.createJson<RequestHandle>(HTTP_EXTENSION_TYPE, {
    name: 'response_close',
});

type HandleStateReceiving = {
    type: 'receiving';
    receive(data: Uint8Array): void;
    close(): void;
};

type HandleStateCreated = {
    type: 'created';
    setResponse(response: HttpResponse): void;
};

type HandleState = HandleStateCreated | HandleStateReceiving;

type WSData = string | ArrayBufferLike | Blob | ArrayBufferView;

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

type WebSocketOpen = RequestHandle & {
    url: string;
    protocol?: string | null;
};
type WebSocketClose = RequestHandle & {
    code?: number;
    reason?: string | null;
};

type WebSocketHandle = {
    ws: OmuWebSocket;
    open: (response: WebSocketOpen) => void;
    dispatch: (data: DataChunk<WSDataMeta>) => void;
    close: (response: WebSocketClose) => void;
};

type WSDataMeta = {
    id: string;
    type:
        | typeof WSMsgType.TEXT
        | typeof WSMsgType.BINARY
        | typeof WSMsgType.PING
        | typeof WSMsgType.PONG;
};

type WSHandleState = {
    type: 'created' | 'receiving';
    handle: WebSocketHandle;
};

const WEBSOCKET_CREATE = PacketType.createJson<HttpRequest>(HTTP_EXTENSION_TYPE, {
    name: 'ws_create',
});

const WEBSOCKET_OPEN = PacketType.createJson<WebSocketOpen>(HTTP_EXTENSION_TYPE, {
    name: 'ws_open',
});

const WEBSOCKET_DATA = PacketType.createSerialized<DataChunk<WSDataMeta>>(HTTP_EXTENSION_TYPE, {
    name: 'ws_data',
    serializer: DataChunk,
});

const WEBSOCKET_CLOSE = PacketType.createJson<WebSocketClose>(HTTP_EXTENSION_TYPE, {
    name: 'ws_close',
});

function createFuture<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
} {
    let resolve: ((value: T) => void) | undefined = undefined;
    let reject: ((reason?: unknown) => void) | undefined = undefined;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    if (!resolve || !reject) throw new Error('Failed to create future');
    return {
        promise,
        resolve,
        reject,
    };
}

type WSSendTask = {
    id: string;
    data: WSData;
};

export class HttpExtension implements Extension {
    public readonly type: ExtensionType<Extension> = HTTP_EXTENSION_TYPE;
    private requestCount: number = 0;

    private readonly httpHandles: Record<string, HandleState | undefined> = {};
    private readonly wsHandles: Record<string, WSHandleState> = {};
    private readonly wsSendQueue: WSSendTask[] = [];
    private wsSendWaitResolve: () => void = () => {};

    constructor(
        private readonly omu: Omu,
    ) {
        omu.network.registerPacket(
            REQUEST_CREATE,
            REQUEST_SEND,
            REQUEST_CLOSE,
            RESPONSE_CREATE,
            RESPONSE_CHUNK,
            RESPONSE_CLOSE,
            WEBSOCKET_CLOSE,
            WEBSOCKET_CREATE,
            WEBSOCKET_DATA,
            WEBSOCKET_OPEN,
        );
        omu.network.addPacketHandler(RESPONSE_CREATE, (packet) => {
            const handle = this.httpHandles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown request', packet.id);
                return;
            }
            if (handle.type !== 'created') {
                console.warn('Received response for already handled request', packet.id);
                return;
            }
            handle.setResponse(packet);
        });
        omu.network.addPacketHandler(RESPONSE_CHUNK, (packet) => {
            const handle = this.httpHandles[packet.meta.id];
            if (!handle) {
                console.warn('Received response for unknown request', packet.meta.id);
                return;
            }
            if (handle.type !== 'receiving') {
                console.warn('Received chunk for non-receiving request', packet.meta.id);
                return;
            }
            handle.receive(packet.body);
        });
        omu.network.addPacketHandler(RESPONSE_CLOSE, (packet) => {
            const handle = this.httpHandles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown request', packet.id);
                return;
            }
            if (handle.type !== 'receiving') {
                console.warn('Received chunk for non-receiving request', packet.id);
                return;
            }
            handle.close();
            delete this.httpHandles[packet.id];
        });
        omu.network.addPacketHandler(WEBSOCKET_OPEN, (packet) => {
            const handle = this.wsHandles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown socket', packet.id);
                return;
            }
            if (handle.type !== 'created') {
                console.warn('Received response for already handled socket', packet.id);
                return;
            }
            handle.handle.open(packet);
            handle.type = 'receiving';
        });
        omu.network.addPacketHandler(WEBSOCKET_DATA, (packet) => {
            const handle = this.wsHandles[packet.meta.id];
            if (!handle) {
                console.warn('Received response for unknown socket', packet.meta.id);
                return;
            }
            if (handle.type !== 'receiving') {
                console.warn('Received chunk for non-receiving socket', packet.meta.id);
                return;
            }
            handle.handle.dispatch(packet);
        });
        omu.network.addPacketHandler(WEBSOCKET_CLOSE, (packet) => {
            const handle = this.wsHandles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown socket', packet.id);
                return;
            }
            handle.handle.close(packet);
            delete this.httpHandles[packet.id];
        });
        omu.event.ready.listen(() => {
            this.wsSendLoop();
        });
    }

    private async wsSendLoop() {
        while (this.omu.running) {
            const send = this.wsSendQueue.shift();
            if (send) {
                const array = await toUint8Array(send.data);
                const type = typeof send.data === 'string' ? WSMsgType.TEXT : WSMsgType.BINARY;
                this.omu.send(WEBSOCKET_DATA, new DataChunk({ id: send.id, type }, array));
            } else {
                await new Promise<void>((resolve) => {
                    this.wsSendWaitResolve = resolve;
                });
            }
        }
    }

    private generateHeaders(request: Request, init?: RequestInit): Record<string, string> {
        const headers: Record<string, string> = {};
        const keys: Record<string, string> = {};
        const set = (key: string, value: string) => {
            const lowerKey = key.toLowerCase();
            const originalKey = keys[lowerKey];
            if (originalKey) {
                delete headers[originalKey];
            }
            headers[key] = value;
            keys[lowerKey] = key;
        };
        request.headers.forEach((value, key) => {
            set(key, value);
        });
        if (init?.headers) {
            if (init.headers instanceof Headers) {
                init.headers.forEach((value, key) => {
                    set(key, value);
                });
            } else if (Array.isArray(init.headers)) {
                for (const [key, value] of init.headers) {
                    set(key, value);
                }
            } else {
                for (const key in init.headers) {
                    const value = init.headers[key];
                    set(key, value);
                }
            }
        }
        return headers;
    }

    private generateId(): Identifier {
        return this.omu.app.id.join(`${performance.timeOrigin}-${this.requestCount++}`);
    }

    public async request(input: string | URL | globalThis.Request, init?: RequestInit): Promise<{ response: HttpResponse; stream: ReadableStream }> {
        const request = new Request(input, init);
        const id = this.generateId().key();
        this.omu.send(REQUEST_CREATE, {
            id,
            header: this.generateHeaders(request, init),
            method: request.method,
            redirect: request.redirect,
            url: request.url,
        });
        if (request.body) {
            const reader = request.body.getReader();
            while (true) {
                const result = await reader.read();
                if (result.done) {
                    break;
                }
                this.omu.send(REQUEST_SEND, {
                    meta: { id },
                    body: result.value,
                });
            }
        }
        this.omu.send(REQUEST_CLOSE, { id });
        const chunks: Uint8Array[] = [];
        const responseFuture = createFuture<HttpResponse>();
        let chunkEvent = createFuture<boolean>();
        const setResponse = (response: HttpResponse) => {
            responseFuture.resolve(response);
            this.httpHandles[id] = {
                type: 'receiving',
                receive(data: Uint8Array<ArrayBufferLike>) {
                    chunks.push(data);
                    chunkEvent.resolve(true);
                    chunkEvent = createFuture<boolean>();
                },
                close() {
                    chunkEvent.resolve(false);
                },
            };
        };
        this.httpHandles[id] = {
            type: 'created',
            setResponse,
        };
        const response = await responseFuture.promise;
        return {
            response,
            stream: new ReadableStream<Uint8Array>({
                async start(controller) {
                    while (await chunkEvent.promise) {
                        const chunk = chunks.shift();
                        if (!chunk) break;
                        controller.enqueue(chunk);
                    }
                    controller.close();
                },
            }),
        };
    }

    public async fetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<OmuResponse> {
        const { response, stream } = await this.request(input, init);
        return new OmuResponse(
            new Headers(response.header),
            response.status >= 200 && response.status < 300,
            response.redirected,
            response.status,
            response.statusText,
            'basic',
            response.url,
            stream,
            false,
        );
    }

    public async ws(input: string | URL | globalThis.Request, options?: {
        method?: string;
        autoclose?: boolean;
        autoping?: boolean;
        params?: Record<string, string>;
        headers?: Record<string, string>;
    }): Promise<OmuWebSocket> {
        const request = new Request(input, options);
        const id = this.generateId();
        this.omu.send(WEBSOCKET_CREATE, {
            id: id.key(),
            header: this.generateHeaders(request, options),
            method: request.method,
            redirect: request.redirect,
            url: request.url,
        });
        const handle = OmuWebSocket.create(
            this.omu,
            id,
            (data) => {
                this.wsSendQueue.push({
                    id: id.key(),
                    data,
                });
                this.wsSendWaitResolve();
            },
            () => {
                delete this.wsHandles[id.key()];
            },
        );
        this.wsHandles[id.key()] = {
            type: 'created',
            handle,
        };
        return handle.ws;
    }
}

class OmuResponse implements Response {
    constructor(
        public readonly headers: Headers,
        public readonly ok: boolean,
        public readonly redirected: boolean,
        public readonly status: number,
        public readonly statusText: string,
        public readonly type: ResponseType,
        public readonly url: string,
        public readonly body: ReadableStream<Uint8Array<ArrayBuffer>> | null,
        public readonly bodyUsed: boolean,
    ) {}

    clone(): OmuResponse {
        return new OmuResponse(
            this.headers,
            this.ok,
            this.redirected,
            this.status,
            this.statusText,
            this.type,
            this.url,
            this.body,
            this.bodyUsed,
        );
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
        return await new Response(this.body).arrayBuffer();
    }
    blob(): Promise<Blob> {
        return new Response(this.body).blob();
    }
    bytes(): Promise<Uint8Array<ArrayBuffer>> {
        return new Response(this.body).arrayBuffer().then((buf) => new Uint8Array(buf));
    }
    formData(): Promise<FormData> {
        return new Response(this.body).formData();
    }
    json(): Promise<any> {
        return new Response(this.body).json();
    }
    text(): Promise<string> {
        return new Response(this.body).text();
    }
}

type EventListenerMap<T> = {
    [K in keyof T]: ((event: T[K]) => unknown)[]
};

class OmuWebSocket implements WebSocket {
    private constructor(
        private readonly omu: Omu,
        private readonly id: Identifier,
        private readonly addQueue: (data: WSData) => void,
        private readonly dispose: () => void,
        private readonly eventListeners: EventListenerMap<WebSocketEventMap> = {
            close: [],
            error: [],
            message: [],
            open: [],
        },
    ) { }

    public static create(omu: Omu, id: Identifier, addQueue: (data: WSData) => void, dispose: () => void): WebSocketHandle {
        const ws = new OmuWebSocket(omu, id, addQueue, dispose);
        return {
            ws,
            open: (response) => {
                ws.url = response.url;
                ws.protocol = response.protocol ?? '';
                ws.readyState = WebSocket.OPEN;
                ws.dispatchEvent(new Event('open'));
            },
            dispatch: (data: DataChunk<WSDataMeta>): void => ws.dispatch(data),
            close: (response) => {
                ws.readyState = WebSocket.CLOSED;
                ws.dispatchEvent(new CloseEvent('close', {
                    code: response.code,
                    reason: response.reason ?? undefined,
                }));
            },
        };
    }

    private toEvent(data: DataChunk<WSDataMeta>): MessageEvent | undefined {
        const { type } = data.meta;
        switch (type) {
            case WSMsgType.PING:
            case WSMsgType.PONG:
                return;
            case WSMsgType.TEXT: {
                return new MessageEvent('message', {
                    data: textDecoder.decode(data.body),
                });
            }
            case WSMsgType.BINARY: {
                return new MessageEvent('message', {
                    data: data.body,
                });
            }
        }
    }

    private dispatch(data: DataChunk<WSDataMeta>) {
        const event = this.toEvent(data);
        if (!event) return;
        this.dispatchEvent(event);
        if (event.type === 'message') {
            this.onmessage?.(event as MessageEvent);
        }
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this.eventListeners[event.type];
        for (const listener of listeners) {
            listener(event);
        }
        return true;
    }

    binaryType: BinaryType = 'blob';
    bufferedAmount: number = 0;
    extensions: string = '';
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
    onerror: ((this: WebSocket, ev: Event) => any) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
    onopen: ((this: WebSocket, ev: Event) => any) | null = null;
    protocol: string = '';
    readyState: 0 | 2 | 1 | 3 = 0;
    url: string = '';
    close(code?: number, reason?: string): void {
        this.omu.send(WEBSOCKET_CLOSE, {
            id: this.id.key(),
            code,
            reason,
        });
        this.dispatchEvent(new CloseEvent('close', { code, reason }));
        this.dispose();
    }
    send(data: WSData): void {
        this.addQueue(data);
    }
    public CONNECTING = 0 as const;
    public OPEN = 1 as const;
    public CLOSING = 2 as const;
    public CLOSED = 3 as const;
    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any): void {
        this.eventListeners[type].push(listener);
    }
    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any): void {
        const listeners = this.eventListeners[type];
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
}

async function toUint8Array(data: string | ArrayBufferLike | Blob | ArrayBufferView): Promise<Uint8Array<ArrayBufferLike>> {
    if (typeof data === 'string') {
        return textEncoder.encode(data);
    } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } else {
        return new Uint8Array(data as ArrayBufferLike);
    }
}


import { textEncoder } from '../../const';
import { Identifier } from '../../identifier';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { Extension, ExtensionType } from '../extension';
import { DataChunk, HttpRequest, OmuResponse, RequestHandle } from './http';
import { OmuWS, WebSocketClose, WebSocketError, WebSocketOpen, WSData, WSDataMeta, WSHandleState, WSMsgType } from './websocket';

export const HTTP_EXTENSION_TYPE: ExtensionType<HttpExtension> = new ExtensionType(
    'http',
    (omu: Omu) => new HttpExtension(omu),
);

export const HTTP_REQUEST_PERMISSION_ID: Identifier = HTTP_EXTENSION_TYPE.join('request');

const REQUEST_CREATE = PacketType.createJson<HttpRequest>(HTTP_EXTENSION_TYPE, {
    name: 'request_create',
});

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

const WEBSOCKET_ERROR = PacketType.createJson<WebSocketError>(HTTP_EXTENSION_TYPE, {
    name: 'ws_error',
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
            WEBSOCKET_ERROR,
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
        omu.network.addPacketHandler(WEBSOCKET_ERROR, (packet) => {
            const handle = this.wsHandles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown socket', packet.id);
                return;
            }
            handle.handle.error(packet);
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
    }): Promise<OmuWS> {
        const request = new Request(input, options);
        const id = this.generateId();
        const handle = OmuWS.create({
            addQueue: (data) => {
                this.wsSendQueue.push({
                    id: id.key(),
                    data,
                });
                this.wsSendWaitResolve();
            },
            dispose: (options: { code?: number; reason?: string }) => {
                this.omu.send(WEBSOCKET_CLOSE, {
                    id: id.key(),
                    code: options.code,
                    reason: options.reason,
                });
                delete this.wsHandles[id.key()];
            },
        });
        this.wsHandles[id.key()] = {
            type: 'created',
            handle,
        };
        this.omu.send(WEBSOCKET_CREATE, {
            id: id.key(),
            header: this.generateHeaders(request, options),
            method: request.method,
            redirect: request.redirect,
            url: request.url,
        });
        return handle.ws;
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

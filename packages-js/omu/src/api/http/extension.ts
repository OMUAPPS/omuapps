import { Client } from '../../client';
import { Identifier } from '../../identifier';
import { PacketType } from '../../network/packet';
import { ByteReader, ByteWriter, JsonType } from '../../serialize';
import { Extension, ExtensionType } from '../extension';

export const HTTP_EXTENSION_TYPE: ExtensionType<HttpExtension> = new ExtensionType(
    'http',
    (client: Client) => new HttpExtension(client),
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

class HttpChunk<T extends JsonType> {
    constructor(
        public readonly meta: T,
        public readonly body: Uint8Array,
    ) { }

    public static serialize<T extends JsonType>(data: HttpChunk<T>) {
        const writer = new ByteWriter();
        writer.writeJSON(data.meta);
        writer.writeUint8Array(data.body);
        return writer.finish();
    }

    public static deserialize<T extends JsonType>(data: Uint8Array): HttpChunk<T> {
        const reader = ByteReader.fromUint8Array(data);
        const meta = reader.readJSON<T>();
        const body = reader.readUint8Array();
        return new HttpChunk(meta, body);
    }
}

const REQUEST_SEND = PacketType.createSerialized<HttpChunk<RequestHandle>>(HTTP_EXTENSION_TYPE, {
    name: 'request_send',
    serializer: HttpChunk,
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

const RESPONSE_CHUNK = PacketType.createSerialized<HttpChunk<RequestHandle>>(HTTP_EXTENSION_TYPE, {
    name: 'response_chunk',
    serializer: HttpChunk,
});

type HttpResponseClose = RequestHandle;

const RESPONSE_CLOSE = PacketType.createJson<HttpResponseClose>(HTTP_EXTENSION_TYPE, {
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

export class HttpExtension implements Extension {
    public readonly type: ExtensionType<Extension> = HTTP_EXTENSION_TYPE;

    private readonly handles: Record<number, HandleState | undefined> = {};

    constructor(
        private readonly client: Client,
    ) {
        client.network.registerPacket(
            REQUEST_CREATE,
            REQUEST_SEND,
            REQUEST_CLOSE,
            RESPONSE_CREATE,
            RESPONSE_CHUNK,
            RESPONSE_CLOSE,
        );
        client.network.addPacketHandler(RESPONSE_CREATE, (packet) => {
            const handle = this.handles[packet.id];
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
        client.network.addPacketHandler(RESPONSE_CHUNK, (packet) => {
            const handle = this.handles[packet.meta.id];
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
        client.network.addPacketHandler(RESPONSE_CLOSE, (packet) => {
            const handle = this.handles[packet.id];
            if (!handle) {
                console.warn('Received response for unknown request', packet.id);
                return;
            }
            if (handle.type !== 'receiving') {
                console.warn('Received chunk for non-receiving request', packet.id);
                return;
            }
            handle.close();
            delete this.handles[packet.id];
        });
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

    private generateId(): string {
        const rnd = Math.floor(performance.timeOrigin + performance.now() - Math.random() * 1e12);
        const id = this.client.app.id.join(`${rnd}`);
        return id.key();
    }

    public async request(input: string | URL | globalThis.Request, init?: RequestInit): Promise<{ response: HttpResponse; stream: ReadableStream }> {
        const request = new Request(input, init);
        const id = this.generateId();
        this.client.send(REQUEST_CREATE, {
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
                this.client.send(REQUEST_SEND, {
                    meta: { id },
                    body: result.value,
                });
            }
        }
        this.client.send(REQUEST_CLOSE, { id });
        const chunks: Uint8Array[] = [];
        const responseFuture = createFuture<HttpResponse>();
        let chunkEvent = createFuture<boolean>();
        const setResponse = (response: HttpResponse) => {
            responseFuture.resolve(response);
            this.handles[id] = {
                type: 'receiving',
                receive(data) {
                    chunks.push(data);
                    chunkEvent.resolve(true);
                    chunkEvent = createFuture<boolean>();
                },
                close() {
                    chunkEvent.resolve(false);
                },
            };
        };
        this.handles[id] = {
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

    public async fetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json(): Promise<any> {
        return new Response(this.body).json();
    }
    text(): Promise<string> {
        return new Response(this.body).text();
    }
}

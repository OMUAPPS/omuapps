import { ByteReader, ByteWriter, JsonType } from '../../serialize';

export type RequestHandle = {
    id: string;
};

export type HttpRequest = RequestHandle & {
    header: Record<string, string>;
    method: string;
    redirect: RequestRedirect;
    url: string;
};

export class DataChunk<T extends JsonType> {
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

export class OmuResponse implements Response {
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

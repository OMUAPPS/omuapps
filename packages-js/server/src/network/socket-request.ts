export class SocketRequest {
    public constructor(
        public readonly remoteAddress: string,
        public readonly origin: string | undefined,
        public readonly url: URL,
    ) {}

    public static from(request: Request, remoteAddress: string): SocketRequest {
        return new SocketRequest(
            remoteAddress,
            request.headers.get('Origin') ?? undefined,
            new URL(request.url),
        );
    }
}

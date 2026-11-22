import type { Models } from '@omujs/chat';

type HeaderWebSocket = new (url: string | URL, options: { headers: Record<string, string> }) => WebSocket;

export class ProviderHttp {
    public static readonly URL_PREFIX: string = String.raw`(https?://)?(www\.)?`;

    public readonly userAgent: string;

    public constructor(provider: Models.Provider) {
        const data = JSON.stringify({
            id: provider.id.key(),
            version: provider.version,
            repository_url: provider.repositoryUrl,
        });
        this.userAgent = `OMUAPPS/${provider.version} ${data}`;
    }

    public fetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
        const headers = new Headers(init.headers);
        if (!headers.has('User-Agent')) headers.set('User-Agent', this.userAgent);
        return fetch(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(15_000) });
    }

    public socket(url: string | URL): WebSocket {
        return new (WebSocket as unknown as HeaderWebSocket)(url, { headers: { 'User-Agent': this.userAgent } });
    }

    public async json<T>(url: string | URL, init: RequestInit = {}): Promise<T> {
        const response = await this.fetch(url, init);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${response.url}`);
        return response.json() as Promise<T>;
    }

    public async text(url: string | URL, init: RequestInit = {}): Promise<string> {
        const response = await this.fetch(url, init);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${response.url}`);
        return response.text();
    }
}

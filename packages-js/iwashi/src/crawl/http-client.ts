import { type HTMLElement, parse } from 'node-html-parser';

export type RequestOptions = {
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    json?: unknown;
    redirect?: RequestRedirect;
    timeoutMs?: number;
};

export class HttpError extends Error {
    public constructor(public readonly response: Response) {
        super(`${response.status} ${response.statusText}: ${response.url}`);
    }
}

export class HttpClient {
    public static readonly USER_AGENT = 'Profile Tree Generator (https://github.com/am230/iwashi)';
    public static readonly BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0';

    public async request(url: string, options: RequestOptions = {}): Promise<Response> {
        const target = new URL(url);
        for (const [key, value] of Object.entries(options.params ?? {})) {
            target.searchParams.set(key, value);
        }
        const headers = new Headers({ 'User-Agent': HttpClient.USER_AGENT });
        for (const [key, value] of Object.entries(options.headers ?? {})) {
            headers.set(key, value);
        }
        if (options.json !== undefined) headers.set('Content-Type', 'application/json');
        return fetch(target, {
            method: options.method ?? (options.json === undefined ? 'GET' : 'POST'),
            headers,
            body: options.json === undefined ? undefined : JSON.stringify(options.json),
            redirect: options.redirect ?? 'follow',
            signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
        });
    }

    public async ok(url: string, options: RequestOptions = {}): Promise<Response> {
        return HttpClient.ensureOk(await this.request(url, options));
    }

    public async text(url: string, options: RequestOptions = {}): Promise<string> {
        return (await this.ok(url, options)).text();
    }

    public async json<T>(url: string, options: RequestOptions = {}): Promise<T> {
        return (await this.ok(url, options)).json() as Promise<T>;
    }

    public async html(url: string, options: RequestOptions = {}): Promise<HTMLElement> {
        return parse(await this.text(url, options));
    }

    public static parse(html: string): HTMLElement {
        return parse(html);
    }

    public static ensureOk(response: Response): Response {
        if (!response.ok) throw new HttpError(response);
        return response;
    }

    public static isChallenge(response: Response): boolean {
        return response.headers.get('Cf-Mitigated') === 'challenge';
    }
}

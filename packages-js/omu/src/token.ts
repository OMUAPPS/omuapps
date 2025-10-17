import type { Address } from './address.js';

import type { App } from './app.js';
import { tryCatch } from './helper.js';

export interface TokenProvider {
    get(serverAddress: Address, app: App): Promise<string | undefined>;
    set(serverAddress: Address, app: App, token: string): Promise<void>;
}

export type SessionParam = {
    address: Address;
    token: string;
};

type TokenRegistry = Record<string, string>;

export class BrowserTokenProvider implements TokenProvider {
    public static readonly TOKEN_PARAM_KEY = '_omu_session';
    constructor(private readonly key: string) {}

    private getKey(address: Address, app: App): string {
        return JSON.stringify([address.host, address.port, address.hash ?? '', app.id.key()]);
    }

    public async set(foundToken: Address, app: App, token: string): Promise<void> {
        const { ok, data: tokens } = tryCatch<TokenRegistry>(() => JSON.parse(localStorage.getItem(this.key) || '{}'));
        if (!ok) {
            console.warn(`Failed to parse stored tokens: ${tokens}`);
            localStorage.removeItem(this.key);
            return;
        }
        const key = this.getKey(foundToken, app);
        tokens[key] = token;
        localStorage.setItem(this.key, JSON.stringify(tokens));
    }

    public async get(address: Address, app: App): Promise<string | undefined> {
        const foundToken = this.parseParamSession(address);
        if (foundToken) return foundToken;
        const tokens = JSON.parse(localStorage.getItem(this.key) || '{}');
        const key = this.getKey(address, app);
        return Promise.resolve(tokens[key] || null);
    }

    private parseParamSession(address: Address): string | undefined {
        const searchParams = new URLSearchParams(location.search);
        const param = searchParams.get(BrowserTokenProvider.TOKEN_PARAM_KEY);
        if (!param) return;
        const { ok, data: session } = tryCatch<SessionParam>(() => JSON.parse(param));
        if (!ok) {
            console.warn(`Failed to parse session from URL parameter: ${session}`);
            return undefined;
        }
        if (session.address.hash !== address.hash) {
            console.warn(`Session address hash does not match: expected ${address.hash}, got ${session.address.hash}`);
            return undefined;
        }
        return session.token;
    }
}

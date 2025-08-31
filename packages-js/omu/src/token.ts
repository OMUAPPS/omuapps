import type { Address } from './address.js';

import type { App } from './index.js';

export interface TokenProvider {
    get(serverAddress: Address, app: App): Promise<string | undefined>;
    set(serverAddress: Address, app: App, token: string): Promise<void>;
}

export class BrowserTokenProvider implements TokenProvider {
    constructor(private readonly key: string) {}

    private getKey(address: Address, app: App): string {
        return JSON.stringify([address.host, address.port, address.hash ?? '', app.key()]);
    }

    public async set(serverAddress: Address, app: App, token: string): Promise<void> {
        const tokens = JSON.parse(localStorage.getItem(this.key) || '{}');
        const key = this.getKey(serverAddress, app);
        tokens[key] = token;
        localStorage.setItem(this.key, JSON.stringify(tokens));
    }

    public async get(serverAddress: Address, app: App): Promise<string | undefined> {
        const tokens = JSON.parse(localStorage.getItem(this.key) || '{}');
        const key = this.getKey(serverAddress, app);
        return Promise.resolve(tokens[key] || null);
    }
}

import type { Address } from './address.js';

import type { App } from './app.js';
import { tryCatch } from './helper.js';

export interface TokenProvider {
    get(serverAddress: Address, app: App): Promise<string | undefined>;
}

export type SessionParam = {
    address: Address;
    token: string;
};

export class BrowserTokenProvider implements TokenProvider {
    public static readonly TOKEN_PARAM_KEY = '_omu_session';

    private getKey(address: Address, app: App): string {
        return JSON.stringify([address.host, address.port, address.hash ?? '', app.id.key()]);
    }

    public async get(address: Address, app: App): Promise<string | undefined> {
        const foundToken = this.parseParamSession(address);
        if (foundToken) return foundToken;
        return;
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

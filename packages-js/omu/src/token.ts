import type { Address } from './address.js';

import type { App } from './app.js';
import { tryCatch } from './helper.js';

export interface SessioTokenProvider {
    get(serverAddress: Address, app: App): Promise<string | undefined>;
}

export type SessionParam = {
    address: Address;
    token: string;
};

export class BrowserSession implements SessioTokenProvider {
    public static readonly PARAM_NAME = '_omu_session';

    public async get(address: Address): Promise<string | undefined> {
        const foundToken = this.parseParamSession(address);
        if (foundToken) return foundToken;
        return;
    }

    private parseParamSession(address: Address): string | undefined {
        const searchParams = new URLSearchParams(location.search);
        const param = searchParams.get(BrowserSession.PARAM_NAME);
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

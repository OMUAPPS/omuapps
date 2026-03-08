import { Identifier, IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { PromiseResult } from '../../result';
import { Serializer } from '../../serialize';
import { EndpointType, InvokedParams } from '../endpoint';
import { Table, TableType } from '../table';
import { AllowedHost, DASHBOARD_EXTENSION_TYPE, DASHBOARD_SET_PERMISSION_ID, UserError, UserResponse } from './constants';
import { DashboardHandler } from './handler';

export type Cookie = {
    name: string;
    value: string;
};

export class CookieList extends Array<Cookie> {
    public toString(): string {
        return this.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    }
}

export type WebviewEvent = {
    type: 'closed';
} | {
    type: 'resize';
    dimensions: {
        x: number;
        y: number;
    };
} | {
    type: 'cookie';
    cookies: Cookie[];
} | {
    type: 'message';
    data: any;
};

export type WebviewEventPacket = {
    id: Identifier;
    target: Identifier;
    event: WebviewEvent;
};

export const DASHBOARD_WEBVIEW_EVENT_PACKET: PacketType<WebviewEventPacket> = PacketType.createJson<WebviewEventPacket>(DASHBOARD_EXTENSION_TYPE, {
    name: 'webview_event',
    serializer: Serializer.noop<WebviewEventPacket>()
        .field('id', Identifier)
        .field('target', Identifier),
});

export type WebviewPacket = {
    id: string;
};

export type WebviewResponse = UserResponse<WebviewPacket>;

export type GetCookiesRequest = {
    url: string;
};

export type WebviewRequest = {
    url: string;
    script?: string;
    center?: boolean;
    position?: { x: number; y: number };
    inner_size?: { x: number; y: number };
    min_inner_size?: { x: number; y: number };
    max_inner_size?: { x: number; y: number };
    resizable?: boolean;
    maximizable?: boolean;
    minimizable?: boolean;
    title?: string;
    maximized?: boolean;
    always_on_bottom?: boolean;
    always_on_top?: boolean;
    shadow?: boolean;
    decorations?: boolean;
    transparent?: boolean;
};

export type WebviewEventListeners = {
    [K in WebviewEvent['type']]?: Array<(event: Extract<WebviewEvent, { type: K }>) => void>;
};

export type WebviewHandle = {
    readonly id: Identifier;
    readonly url: string;
    getCookies(): PromiseResult<CookieList, UserError>;
    on<T extends WebviewEvent['type']>(key: T, callback: (event: Extract<WebviewEvent, { type: T }>) => void): void;
    close(): Promise<void>;
    join(): Promise<void>;
};

export type WebviewEventEmit = <T extends WebviewEvent['type']>(event: Extract<WebviewEvent, { type: T }>) => void;

export const DASHBOARD_WEBVIEW_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('webview');

const DASHBOARD_ALLOWED_WEBVIEW_HOSTS = TableType.createJson<AllowedHost>(DASHBOARD_EXTENSION_TYPE, {
    name: 'allowed_webview_hosts',
    key: (entry) => entry.id,
    permissions: { all: DASHBOARD_SET_PERMISSION_ID },
});

const DASHBOARD_HOST_REQUEST = EndpointType.createJson<{ host: string }, UserResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'host_request',
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

const DASHBOARD_COOKIES_GET = EndpointType.createJson<GetCookiesRequest, UserResponse<Cookie[]>>(DASHBOARD_EXTENSION_TYPE, {
    name: 'cookies_get',
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

const DASHBOARD_WEBVIEW_REQUEST = EndpointType.createJson<WebviewRequest, WebviewResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'webview_request',
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

const DASHBOARD_WEBVIEW_CLOSE = EndpointType.createJson<WebviewPacket, WebviewResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'webview_close',
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

export class WebviewAPI {
    private readonly webviewHandles: IdentifierMap<{ handle: WebviewHandle; emit: WebviewEventEmit }> = new IdentifierMap();
    public readonly allowedHosts: Table<AllowedHost>;

    constructor(
        private readonly omu: Omu,
    ) {
        omu.network.registerPacket(
            DASHBOARD_WEBVIEW_EVENT_PACKET,
        );
        omu.network.addPacketHandler(DASHBOARD_WEBVIEW_EVENT_PACKET, (packet) => {
            const handle = this.webviewHandles.get(packet.id);
            if (!handle) return;
            handle.emit(packet.event);
        });
        this.allowedHosts = omu.tables.get(DASHBOARD_ALLOWED_WEBVIEW_HOSTS);
    }

    public setDashboard(dashboard: DashboardHandler): void {
        const requireHost = async (params: InvokedParams, host: string): Promise<UserResponse<undefined>> => {
            const hostNamespace = host.split('.').reverse().join('.');
            if (params.caller.namespace === hostNamespace) {
                return { type: 'ok', value: undefined };
            }

            const id = params.caller.key();
            const hostEntry: AllowedHost = await this.allowedHosts.get(id) ?? { id: id, hosts: [] };
            const allowed = hostEntry.hosts.includes(host);

            if (!allowed) {
                const result = await dashboard.handleHostRequest({ host }, params);

                if (result === 'accept') {
                    const hostEntry: AllowedHost = await this.allowedHosts.get(id) ?? { id: id, hosts: [] };
                    hostEntry.hosts.push(host);
                    await this.allowedHosts.update(hostEntry);
                } else {
                    return { type: 'cancelled' };
                }
            }

            return { type: 'ok', value: undefined };
        };

        this.omu.server.apps.event.remove.listen(async (apps) => {
            for (const app of apps.values()) {
                const hosts = await this.allowedHosts.get(app.id.key());
                if (!hosts) continue;
                this.allowedHosts.remove(hosts);
            }
        });
        this.omu.endpoints.bind(DASHBOARD_COOKIES_GET, async (request, params): Promise<UserResponse<Cookie[]>> => {
            const { url } = request;
            const { host } = new URL(url);
            const hostAccessResult = await requireHost(params, host);
            if (hostAccessResult.type !== 'ok') {
                return hostAccessResult;
            }
            return await dashboard.getCookies(request);
        });
        this.omu.endpoints.bind(DASHBOARD_HOST_REQUEST, async (request, params): Promise<UserResponse> => {
            const { host } = request;
            const result = await requireHost(params, host);
            return result;
        });
        this.omu.endpoints.bind(DASHBOARD_WEBVIEW_REQUEST, async (request, params): Promise<WebviewResponse> => {
            const url = new URL(request.url);
            const { host } = url;
            const hostAccessResult = await requireHost(params, host);
            if (hostAccessResult.type !== 'ok') {
                return hostAccessResult;
            }

            let webviewId: Identifier | null = null;
            const emit = async (event: WebviewEvent) => {
                if (!webviewId) return;
                this.omu.send(DASHBOARD_WEBVIEW_EVENT_PACKET, { id: webviewId, target: params.caller, event });
            };

            const id = await dashboard.createWebview(request, params, emit);
            webviewId = id;

            return {
                type: 'ok',
                value: {
                    id: id.key(),
                },
            };
        });
        this.omu.endpoints.bind(DASHBOARD_WEBVIEW_CLOSE, async (request, params): Promise<WebviewResponse> => {
            const id = await dashboard.getWebview(request, params);
            if (!id) {
                return {
                    type: 'cancelled',
                };
            }
            await dashboard.closeWebview(request, params);
            return {
                type: 'ok',
                value: {
                    id: id.key(),
                },
            };
        });
    }

    public requestWebview(options: WebviewRequest): PromiseResult<WebviewHandle, UserError> {
        const { promise, resolve, reject } = PromiseResult.create<WebviewHandle, UserError>();
        this.omu.endpoints.call(
            DASHBOARD_WEBVIEW_REQUEST,
            options,
        ).then((result) => {
            if (result.type !== 'ok') {
                reject(result);
                return;
            }
            const { value } = result;
            const id = Identifier.fromKey(value.id);
            const eventListeners: WebviewEventListeners = {};
            const handle: WebviewHandle = {
                id,
                url: options.url,
                close: async () => {
                    await this.omu.endpoints.call(
                        DASHBOARD_WEBVIEW_CLOSE,
                        { id: id.key() },
                    );
                },
                getCookies: () => this.getCookies({
                    url: options.url,
                }),
                on: function <T extends WebviewEvent['type']>(key: T, callback: (event: Extract<WebviewEvent, { type: T }>) => void): void {
                    if (!eventListeners[key]) {
                        eventListeners[key] = [];
                    }
                    const listeners = eventListeners[key]!;
                    listeners.push(callback);
                },
                join: async () => {
                    await new Promise<void>((resolve) => {
                        handle.on('closed', () => resolve());
                    });
                },
            };
            this.webviewHandles.set(id, {
                handle,
                emit: function <T extends WebviewEvent['type']>(event: Extract<WebviewEvent, { type: T }>): void {
                    const listeners = eventListeners[event.type];
                    if (!listeners) return;
                    for (const listener of listeners) {
                        listener(event);
                    }
                },
            });

            resolve(handle);
        });
        return promise;
    }

    public getCookies(options: GetCookiesRequest): PromiseResult<CookieList, UserError> {
        const { promise, resolve, reject } = PromiseResult.create<CookieList, UserError>();
        this.omu.endpoints.call(
            DASHBOARD_COOKIES_GET,
            options,
        ).then((response) => {
            if (response.type === 'ok') {
                resolve(CookieList.from(response.value));
                return;
            } else {
                reject(response);
            }
        });
        return promise;
    }
}

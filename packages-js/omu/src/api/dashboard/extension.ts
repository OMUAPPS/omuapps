import { App, AppJson } from '../../app.js';
import { Identifier, IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet/packet.js';
import { Omu } from '../../omu.js';
import { PromiseResult } from '../../result.js';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import { InvokedParams } from '../endpoint/packets.js';
import { ExtensionType } from '../extension.js';
import { PermissionTypeJson } from '../permission/permission.js';
import { PackageInfo } from '../plugin/package-info.js';
import { Registry, RegistryType } from '../registry/registry.js';
import { AppIndexRegistryMeta } from '../server/extension.js';
import type { Table } from '../table/table.js';
import { TableType } from '../table/table.js';

import type { DashboardHandler } from './handler.js';
import { AppInstallResponse, DragDrop, DragDropReadRequest, DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequest, DragDropRequestDashboard, DragDropRequestResponse, DragEnter, DragLeave, DragOver, FileDragPacket } from './packets.js';

export const DASHBOARD_EXTENSION_TYPE: ExtensionType<DashboardExtension> = new ExtensionType(
    'dashboard',
    (omu: Omu) => new DashboardExtension(omu),
);

type DashboardSetResponse = {
    success: boolean;
};
export const DASHBOARD_SET_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('set');
const DASHBOARD_SET_ENDPOINT = EndpointType.createJson<Identifier, DashboardSetResponse>(
    DASHBOARD_EXTENSION_TYPE,
    {
        name: 'set',
        requestSerializer: Identifier,
        permissionId: DASHBOARD_SET_PERMISSION_ID,
    },
);
export const DASHBOARD_OPEN_APP_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'open');
const DASHBOARD_OPEN_APP_ENDPOINT = EndpointType.createJson<App, void>(DASHBOARD_EXTENSION_TYPE, {
    name: 'open_app',
    requestSerializer: App,
    permissionId: DASHBOARD_OPEN_APP_PERMISSION_ID,
});
const DASHBOARD_OPEN_APP_PACKET = PacketType.createJson<App>(DASHBOARD_EXTENSION_TYPE, {
    name: 'open_app',
    serializer: App,
});
export const DASHOBARD_APP_READ_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'read');
export const DASHOBARD_APP_EDIT_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'edit');
export const DASHBOARD_APP_INSTALL_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'install');
const DASHBOARD_APP_INSTALL_ENDPOINT = EndpointType.createJson<App, AppInstallResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app',
    requestSerializer: App,
    permissionId: DASHBOARD_APP_INSTALL_PERMISSION_ID,
});
export const DAShBOARD_DRAG_DROP_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('drag_drop');
const DASHBOARD_DRAG_DROP_STATE_PACKET = PacketType.createJson<FileDragPacket>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_state',
    serializer: Serializer.noop<FileDragPacket>()
        .field('app', App),
});
const DASHBOARD_DRAG_DROP_READ_ENDPOINT = EndpointType.createSerialized<DragDropReadRequest, DragDropReadResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_read',
    requestSerializer: Serializer.json(),
    responseSerializer: DragDropReadResponse,
});
const DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET = PacketType.createJson<DragDropReadRequestDashboard>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_read_request',
});
const DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET = PacketType.createSerialized<DragDropReadResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_read_response',
    serializer: DragDropReadResponse,
});
const DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT = EndpointType.createJson<DragDropRequest, DragDropRequestResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_request',
    permissionId: DAShBOARD_DRAG_DROP_PERMISSION_ID,
});
const DASHBOARD_DRAG_DROP_REQUEST_PACKET = PacketType.createJson<DragDropRequestDashboard>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_request',
});
const DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET = PacketType.createJson<DragDropRequestResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_request_approval',
});

type DragDropHandler = {
    onEnter(fn: (event: DragEnter) => unknown): void;
    onOver(fn: (event: DragOver) => unknown): void;
    onDrop(fn: (event: DragDrop) => unknown): void;
    onLeave(fn: (event: DragLeave) => unknown): void;
    read(id: string): Promise<DragDropReadResponse>;
};

export type Cookie = {
    name: string;
    value: string;
};

export type WebviewRequest = {
    url: string;
    script?: string;
};

export type WebviewPacket = {
    id: string;
};

export type UserResponse<T = undefined> = {
    type: 'ok';
    value: T;
} | {
    type: 'blocked';
} | {
    type: 'cancelled';
};

export type UserError = Exclude<UserResponse, { type: 'ok' }>;

export type WebviewResponse = UserResponse<WebviewPacket>;

export const DASHBOARD_WEBVIEW_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('webview');

export type HostRequest = {
    host: string;
};

export type GetCookiesRequest = {
    url: string;
};

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

export type WebviewEvent = {
    type: 'closed';
} | {
    type: 'resize';
    dimentions: {
        x: number;
        y: number;
    };
} | {
    type: 'cookie';
    cookies: Cookie[];
};

export type WebviewEventListeners = {
    [K in WebviewEvent['type']]?: Array<(event: Extract<WebviewEvent, { type: K }>) => void>;
};

export type WebviewEventPacket = {
    id: Identifier;
    target: Identifier;
    event: WebviewEvent;
};

export type WebviewHandle = {
    readonly id: Identifier;
    readonly url: string;
    getCookies(): PromiseResult<Cookie[], UserError>;
    on<T extends WebviewEvent['type']>(key: T, callback: (event: Extract<WebviewEvent, { type: T }>) => void): void;
    close(): Promise<void>;
    join(): Promise<void>;
};

export type WebviewEventEmit = <T extends WebviewEvent['type']>(event: Extract<WebviewEvent, { type: T }>) => void;

const DASHBOARD_WEBVIEW_EVENT_PACKET = PacketType.createJson<WebviewEventPacket>(DASHBOARD_EXTENSION_TYPE, {
    name: 'webview_event',
    serializer: Serializer.noop<WebviewEventPacket>()
        .field('id', Identifier)
        .field('target', Identifier),
});

type AllowedHost = {
    id: string;
    hosts: string[];
};

const DASHBOARD_ALLOWED_WEBVIEW_HOSTS = TableType.createJson<AllowedHost>(DASHBOARD_EXTENSION_TYPE, {
    name: 'allowed_webview_hosts',
    key: (entry) => entry.id,
    permissions: { all: DASHBOARD_SET_PERMISSION_ID },
});

const DASHBOARD_HOST_REQUEST = EndpointType.createJson<{
    host: string;
}, UserResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'host_request',
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

export const DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('speech_recognition');

export type TranscriptSegment = {
    confidence: number;
    transcript: string;
};

export type TranscriptStatus = {
    type: 'idle';
} | {
    type: 'result';
    timestamp: number;
    segments: TranscriptSegment[];
} | {
    type: 'final';
    timestamp: number;
    segments: TranscriptSegment[];
} | {
    type: 'audio_started';
    timestamp: number;
} | {
    type: 'audio_ended';
    timestamp: number;
};

const DASHBOARD_SPEECH_RECOGNITION = RegistryType.createJson<TranscriptStatus>(DASHBOARD_EXTENSION_TYPE, {
    name: 'speech_recognition',
    defaultValue: { type: 'idle' },
    permissions: {
        read: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        write: DASHBOARD_SET_PERMISSION_ID,
    },
});

export type SpeechRecognitionStart = {
    type: 'start';
};

const DASHBOARD_SPEECH_RECOGNITION_START = EndpointType.createJson<SpeechRecognitionStart, UserResponse<undefined>>(DASHBOARD_EXTENSION_TYPE, {
    name: 'speech_recognition_start',
    permissionId: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
});

interface PromptRequestBase<T extends string> {
    kind: T;
    id: string;
}

export interface PromptRequestAppPermissions extends PromptRequestBase<'app/permissions'> {
    app: AppJson;
    permissions: PermissionTypeJson[];
}

export interface PromptRequestAppPlugins extends PromptRequestBase<'app/plugins'> {
    app: AppJson;
    packages: PackageInfo[];
}

export interface PromptRequestAppInstall extends PromptRequestBase<'app/install'> {
    app: AppJson;
    dependencies: Record<string, AppJson>;
}

export interface PromptRequestAppUpdate extends PromptRequestBase<'app/update'> {
    old_app: AppJson;
    new_app: AppJson;
    dependencies: Record<string, AppJson>;
}

export interface PromptRequestIndexInstall extends PromptRequestBase<'index/install'> {
    index_url: string;
    meta?: AppIndexRegistryMeta;
}

export interface PortProcess {
    port: number;
    name: string;
    exe: string;
}

export interface PromptRequestHttpPort extends PromptRequestBase<'http/port'> {
    app: AppJson;
    processes: PortProcess[];
}

export type PromptRequest = (
    PromptRequestAppPermissions
    | PromptRequestAppPlugins
    | PromptRequestAppInstall
    | PromptRequestAppUpdate
    | PromptRequestIndexInstall
    | PromptRequestHttpPort
);

const DASHBOARD_PROMPT_REQUEST = PacketType.createJson<PromptRequest>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_request',
});

export type PromptResult = 'accept' | 'deny' | 'block';

interface PromptResponse {
    id: string;
    kind: string;
    result: PromptResult;
}

const DASHBOARD_PROMPT_RESPONSE = PacketType.createJson<PromptResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_response',
});

const DASHBOARD_PROMPT_CLEAR_BLOCKED = EndpointType.createJson<null, null>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_clear_blocked',
});

export class DashboardExtension {
    public readonly type: ExtensionType<DashboardExtension> = DASHBOARD_EXTENSION_TYPE;
    private dashboard: DashboardHandler | null = null;
    private dragDropHandler: DragDropHandler | null = null;
    private dragDropListeners = {
        enter: [] as Array<(state: DragEnter) => unknown>,
        over: [] as Array<(state: DragOver) => unknown>,
        drop: [] as Array<(state: DragDrop) => unknown>,
        leave: [] as Array<(state: DragLeave) => unknown>,
    };
    public readonly allowedHosts: Table<AllowedHost>;
    public readonly speechRecognition: Registry<TranscriptStatus>;
    private readonly webviewHandles: IdentifierMap<{ handle: WebviewHandle; emit: WebviewEventEmit }> = new IdentifierMap();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            DASHBOARD_OPEN_APP_PACKET,
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET,
            DASHBOARD_WEBVIEW_EVENT_PACKET,
            DASHBOARD_PROMPT_REQUEST,
            DASHBOARD_PROMPT_RESPONSE,
        );
        omu.network.addPacketHandler(DASHBOARD_PROMPT_REQUEST, (request) => {
            this.handlePromptRequest(request);
        });
        omu.network.addPacketHandler(DASHBOARD_OPEN_APP_PACKET, (app) => {
            this.handleOpenApp(app);
        });
        omu.network.addPacketHandler(DASHBOARD_DRAG_DROP_REQUEST_PACKET, (request) => {
            this.handleDragDropRequest(request);
        });
        omu.network.addPacketHandler(DASHBOARD_DRAG_DROP_STATE_PACKET, ({ state }) => {
            switch (state.type) {
                case 'enter': {
                    this.dragDropListeners.enter.forEach((fn) => fn(state));
                    break;
                }
                case 'over': {
                    this.dragDropListeners.over.forEach((fn) => fn(state));
                    break;
                }
                case 'drop': {
                    this.dragDropListeners.drop.forEach((fn) => fn(state));
                    break;
                }
                case 'leave': {
                    this.dragDropListeners.leave.forEach((fn) => fn(state));
                    break;
                }
            }
        });
        omu.network.addPacketHandler(DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET, (request) => {
            this.handleDragDropReadRequest(request);
        });
        omu.network.addPacketHandler(DASHBOARD_WEBVIEW_EVENT_PACKET, (packet) => {
            const handle = this.webviewHandles.get(packet.id);
            if (!handle) return;
            handle.emit(packet.event);
        });
        this.allowedHosts = omu.tables.get(DASHBOARD_ALLOWED_WEBVIEW_HOSTS);
        this.speechRecognition = omu.registries.get(DASHBOARD_SPEECH_RECOGNITION);
    }

    private async executeRequestForDashboard(request: PromptRequest): Promise<PromptResult> {
        const dashboard = this.getDashboard();
        switch (request.kind) {
            case 'app/permissions':
                return await dashboard.handlePermissionRequest(request);
            case 'app/plugins':
                return await dashboard.handlePluginRequest(request);
            case 'app/install':
                return await dashboard.handleInstallApp(request);
            case 'app/update':
                return await dashboard.handleUpdateApp(request);
            case 'index/install':
                return await dashboard.handleIndexInstall(request);
            case 'http/port':
                return await dashboard.handleHttpPortRequest(request);
            default:
                throw new Error(`Unknown prompt requested: ${JSON.stringify(request)}`);
        }
    }

    private async handlePromptRequest(request: PromptRequest): Promise<void> {
        const response = await this.executeRequestForDashboard(request);
        this.omu.send(DASHBOARD_PROMPT_RESPONSE, {
            id: request.id,
            kind: request.kind,
            result: response,
        });
    }

    private async handleOpenApp(app: App): Promise<void> {
        const dashboard = this.getDashboard();
        await dashboard.handleOpenApp(app);
    }

    private async handleDragDropRequest(request: DragDropRequestDashboard): Promise<void> {
        const dashboard = this.getDashboard();
        const accepted = await dashboard.handleDragDropRequest(request);
        this.omu.send(DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET, {
            ok: accepted,
            request_id: request.request_id,
        });
    }

    private async handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleDragDropReadRequest(request);
        this.omu.send(DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET, response);
    }

    private getDashboard(): DashboardHandler {
        if (this.dashboard === null) {
            throw new Error('Dashboard not set');
        }
        return this.dashboard;
    }

    public set(dashboard: DashboardHandler): void {
        this.omu.permissions.require(DASHBOARD_SET_PERMISSION_ID);
        if (this.dashboard !== null) {
            throw new Error('Dashboard already set');
        }
        this.dashboard = dashboard;

        this.omu.server.apps.event.remove.listen(async (apps) => {
            for (const app of apps.values()) {
                const hosts = await this.allowedHosts.get(app.id.key());
                if (!hosts) continue;
                this.allowedHosts.remove(hosts);
            }
        });

        const requireHost = async (params: InvokedParams, host: string): Promise<UserResponse<undefined>> => {
            const id = params.caller.key();
            const hostEntry: AllowedHost = await this.allowedHosts.get(id) ?? { id: id, hosts: [] };
            const allowed = hostEntry.hosts.includes(host);
            if (!allowed) {
                const result = await dashboard.handleHostRequest({
                    host,
                }, params);
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
            const emit = async (event: WebviewEvent) => {
                this.omu.send(DASHBOARD_WEBVIEW_EVENT_PACKET, {
                    id,
                    target: params.caller,
                    event,
                });
            };
            const id = await dashboard.createWebview(request, params, emit);
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
        this.omu.endpoints.bind(DASHBOARD_SPEECH_RECOGNITION_START, async (request, params): Promise<UserResponse<undefined>> => {
            const result = await dashboard.speechRecognitionStart(request, params);
            return result;
        });
        this.omu.network.addTask(async () => {
            const response = await this.omu.endpoints.call(
                DASHBOARD_SET_ENDPOINT,
                this.omu.app.id,
            );
            if (!response.success) {
                throw new Error('Failed to set dashboard');
            }
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

    public getCookies(options: GetCookiesRequest): PromiseResult<Cookie[], UserError> {
        const { promise, resolve, reject } = PromiseResult.create<Cookie[], UserError>();
        this.omu.endpoints.call(
            DASHBOARD_COOKIES_GET,
            options,
        ).then((response) => {
            if (response.type === 'ok') {
                resolve(response.value);
                return;
            } else {
                reject(response);
            }
        });
        return promise;
    }

    public async openApp(app: App): Promise<void> {
        return await this.omu.endpoints.call(DASHBOARD_OPEN_APP_ENDPOINT, app);
    }

    public async installApp(app: App): Promise<AppInstallResponse> {
        return await this.omu.endpoints.call(DASHBOARD_APP_INSTALL_ENDPOINT, app);
    }

    public async clearBlockedPrompts(): Promise<null> {
        return await this.omu.endpoints.call(DASHBOARD_PROMPT_CLEAR_BLOCKED, null);
    }

    public async requestDragDrop(): Promise<DragDropHandler> {
        await this.omu.endpoints.call(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, {});
        const listeners = this.dragDropListeners;
        const client = this.omu;
        this.dragDropHandler = {
            onEnter(fn) { listeners.enter.push(fn); },
            onOver(fn) { listeners.over.push(fn); },
            onDrop(fn) { listeners.drop.push(fn); },
            onLeave(fn) { listeners.leave.push(fn); },
            async read(id) { return await client.endpoints.call(DASHBOARD_DRAG_DROP_READ_ENDPOINT, { drag_id: id }); },
        };
        return this.dragDropHandler;
    }

    public async notifyDropDragState(packet: FileDragPacket): Promise<void> {
        this.omu.send(DASHBOARD_DRAG_DROP_STATE_PACKET, packet);
    }

    public requestSpeechRecognition(): PromiseResult<Registry<TranscriptStatus>, UserError> {
        const { promise, resolve, reject } = PromiseResult.create<Registry<TranscriptStatus>, UserError>();
        this.omu.endpoints.call(DASHBOARD_SPEECH_RECOGNITION_START, { type: 'start' }).then((result) => {
            if (result.type === 'ok') {
                resolve(this.speechRecognition);
            } else {
                reject(result);
            }
        });
        return promise;
    }
}

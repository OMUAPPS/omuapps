import { App } from '../../app.js';
import { Identifier, IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet/packet.js';
import { Omu } from '../../omu.js';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';
import { Registry, RegistryPermissions, RegistryType } from '../registry/registry.js';
import type { Table } from '../table/table.js';
import { TableType } from '../table/table.js';

import type { DashboardHandler } from './handler.js';
import { AppInstallRequest, AppInstallResponse, AppUpdateRequest, AppUpdateResponse, DragDrop, DragDropReadRequest, DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequest, DragDropRequestDashboard, DragDropRequestResponse, DragEnter, DragLeave, DragOver, FileDragPacket, PermissionRequestPacket, PluginRequestPacket } from './packets.js';

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
const DASHBOARD_PERMISSION_REQUEST_PACKET = PacketType.createSerialized<PermissionRequestPacket>(
    DASHBOARD_EXTENSION_TYPE,
    {
        name: 'permission_request',
        serializer: PermissionRequestPacket,
    },
);
const DASHBOARD_PERMISSION_ACCEPT_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'permission_accept',
});
const DASHBOARD_PERMISSION_DENY_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'permission_deny',
});
const DASHBOARD_PLUGIN_REQUEST_PACKET = PacketType.createSerialized<PluginRequestPacket>(
    DASHBOARD_EXTENSION_TYPE,
    {
        name: 'plugin_request',
        serializer: PluginRequestPacket,
    },
);
const DASHBOARD_PLUGIN_ACCEPT_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'plugin_accept',
});
const DASHBOARD_PLUGIN_DENY_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'plugin_deny',
});
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
const DASHBOARD_APP_TABLE_TYPE = TableType.createJson(DASHBOARD_EXTENSION_TYPE, {
    name: 'apps',
    serializer: App,
    key: (app) => app.id.key(),
    permissions: {
        read: DASHOBARD_APP_READ_PERMISSION_ID,
        write: DASHOBARD_APP_EDIT_PERMISSION_ID,
        remove: DASHOBARD_APP_EDIT_PERMISSION_ID,
    },
});
export const DASHBOARD_APP_INSTALL_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'install');
const DASHBOARD_APP_INSTALL_ENDPOINT = EndpointType.createJson<App, AppInstallResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app',
    requestSerializer: App,
    permissionId: DASHBOARD_APP_INSTALL_PERMISSION_ID,
});
const DASHBOARD_APP_INSTALL_PACKET = PacketType.createSerialized<AppInstallRequest>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app',
    serializer: AppInstallRequest,
});
const DASHBOARD_APP_INSTALL_ACCEPT_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app_accept',
});
const DASHBOARD_APP_INSTALL_DENY_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app_deny',
});
const DASHBOARD_APP_UPDATE_PERMISSION_ID = DASHBOARD_EXTENSION_TYPE.join('app', 'update');
const DASHBOARD_APP_UPDATE_ENDPOINT = EndpointType.createJson<App, AppUpdateResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'update_app',
    requestSerializer: App,
    permissionId: DASHBOARD_APP_UPDATE_PERMISSION_ID,
});
const DASHBOARD_APP_UPDATE_PACKET = PacketType.createSerialized<AppUpdateRequest>(DASHBOARD_EXTENSION_TYPE, {
    name: 'update_app',
    serializer: AppUpdateRequest,
});
const DASHBOARD_APP_UPDATE_ACCEPT_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'update_app_accept',
});
const DASHBOARD_APP_UPDATE_DENY_PACKET = PacketType.createJson<string>(DASHBOARD_EXTENSION_TYPE, {
    name: 'update_app_deny',
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
    script: string;
};

export type WebviewPacket = {
    id: Identifier;
};

export type UserResponse<T = undefined> = {
    type: 'ok';
    value: T;
} | {
    type: 'blocked';
} | {
    type: 'cancelled';
};
export class UserResult<T> {
    constructor(
        public result: {
            type: 'ok';
            value: T;
        } | {
            type: 'blocked';
        } | {
            type: 'cancelled';
        },
    ) {}

    public unwrap(): T {
        if (this.result.type === 'ok') return this.result.value;
        throw new Error(`Tried to unwrap a ${this.result.type} result`);
    }
}

export type WebviewResponse = UserResponse & WebviewPacket;

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
    responseSerializer: Serializer.noop<WebviewResponse>()
        .field('id', Identifier),
    permissionId: DASHBOARD_WEBVIEW_PERMISSION_ID,
});

const DASHBOARD_WEBVIEW_CLOSE = EndpointType.createJson<WebviewPacket, WebviewResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'webview_close',
    requestSerializer: Serializer.noop<WebviewPacket>()
        .field('id', Identifier),
    responseSerializer: Serializer.noop<WebviewResponse>()
        .field('id', Identifier),
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
    getCookies(): Promise<Cookie[]>;
    close(): void;
    on<T extends WebviewEvent['type']>(key: T, callback: (event: Extract<WebviewEvent, { type: T }>) => void): void;
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
    host: string;
    apps: Identifier[];
};

const DASHBOARD_ALLOWED_HOSTS = TableType.createJson<AllowedHost>(DASHBOARD_EXTENSION_TYPE, {
    name: 'hosts',
    key: (entry) => entry.host,
    serializer: Serializer.noop<AllowedHost>()
        .field('apps', Serializer.of(Identifier).toArray()),
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
    permissions: RegistryPermissions.of({
        read: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        write: DASHBOARD_SET_PERMISSION_ID,
    }),
});

export type SpeechRecognitionStart = {
    type: 'start';
};

const DASHBOARD_SPEECH_RECOGNITION_START = EndpointType.createJson<SpeechRecognitionStart, UserResponse<undefined>>(DASHBOARD_EXTENSION_TYPE, {
    name: 'speech_recognition_start',
    permissionId: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
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
    public readonly apps: Table<App>;
    public readonly allowedHosts: Table<AllowedHost>;
    public readonly speechRecognition: Registry<TranscriptStatus>;
    private readonly webviewHandles: IdentifierMap<{ handle: WebviewHandle; emit: WebviewEventEmit }> = new IdentifierMap();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            DASHBOARD_PERMISSION_REQUEST_PACKET,
            DASHBOARD_PERMISSION_ACCEPT_PACKET,
            DASHBOARD_PERMISSION_DENY_PACKET,
            DASHBOARD_PLUGIN_REQUEST_PACKET,
            DASHBOARD_PLUGIN_ACCEPT_PACKET,
            DASHBOARD_PLUGIN_DENY_PACKET,
            DASHBOARD_OPEN_APP_PACKET,
            DASHBOARD_APP_INSTALL_PACKET,
            DASHBOARD_APP_INSTALL_ACCEPT_PACKET,
            DASHBOARD_APP_INSTALL_DENY_PACKET,
            DASHBOARD_APP_UPDATE_PACKET,
            DASHBOARD_APP_UPDATE_ACCEPT_PACKET,
            DASHBOARD_APP_UPDATE_DENY_PACKET,
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_PACKET,
            DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET,
            DASHBOARD_WEBVIEW_EVENT_PACKET,
        );
        omu.network.addPacketHandler(DASHBOARD_PERMISSION_REQUEST_PACKET, (request) =>
            this.handlePermissionRequest(request),
        );
        omu.network.addPacketHandler(DASHBOARD_PLUGIN_REQUEST_PACKET, (request) =>
            this.handlePluginRequest(request),
        );
        omu.network.addPacketHandler(DASHBOARD_APP_INSTALL_PACKET, async (request) => {
            this.handleInstallApp(request);
        });
        omu.network.addPacketHandler(DASHBOARD_APP_UPDATE_PACKET, async (request) => {
            this.handleUpdateApp(request);
        });
        omu.network.addPacketHandler(DASHBOARD_OPEN_APP_PACKET, (app) =>
            this.handleOpenApp(app),
        );
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
        this.apps = omu.tables.get(DASHBOARD_APP_TABLE_TYPE);
        this.allowedHosts = omu.tables.get(DASHBOARD_ALLOWED_HOSTS);
        this.speechRecognition = omu.registries.get(DASHBOARD_SPEECH_RECOGNITION);
    }

    private async handlePermissionRequest(request: PermissionRequestPacket): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handlePermissionRequest(request);
        if (response) {
            this.omu.send(DASHBOARD_PERMISSION_ACCEPT_PACKET, request.requestId);
        } else {
            this.omu.send(DASHBOARD_PERMISSION_DENY_PACKET, request.requestId);
        }
    }

    private async handlePluginRequest(request: PluginRequestPacket): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handlePluginRequest(request);
        if (response) {
            this.omu.send(DASHBOARD_PLUGIN_ACCEPT_PACKET, request.requestId);
        } else {
            this.omu.send(DASHBOARD_PLUGIN_DENY_PACKET, request.requestId);
        }
    }

    private async handleInstallApp(request: AppInstallRequest): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleInstallApp(request);
        if (response) {
            this.omu.send(DASHBOARD_APP_INSTALL_ACCEPT_PACKET, request.requestId);
        } else {
            this.omu.send(DASHBOARD_APP_INSTALL_DENY_PACKET, request.requestId);
        }
    }

    private async handleUpdateApp(request: AppUpdateRequest): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleUpdateApp(request);
        if (response) {
            this.omu.send(DASHBOARD_APP_UPDATE_ACCEPT_PACKET, request.requestId);
        } else {
            this.omu.send(DASHBOARD_APP_UPDATE_DENY_PACKET, request.requestId);
        }
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
        this.omu.endpoints.bind(DASHBOARD_COOKIES_GET, async (request, params): Promise<UserResponse<Cookie[]>> => {
            const { url } = request;
            const { hostname } = new URL(url);
            const allowedHost = await this.allowedHosts.get(hostname) ?? { host: hostname, apps: [] };
            const allowed = allowedHost.apps.some((host) => host.isEqual(params.caller));
            if (!allowed) {
                return {
                    type: 'cancelled',
                };
            }
            return await dashboard.getCookies(request);
        });
        this.omu.endpoints.bind(DASHBOARD_HOST_REQUEST, async (request, params): Promise<UserResponse> => {
            const { host } = request;
            const hostEntry = await this.allowedHosts.get(host) ?? { host, apps: [] };
            const allowed = hostEntry.apps.some((host) => host.isEqual(params.caller));
            if (allowed) {
                return {
                    type: 'ok',
                    value: undefined,
                };
            }
            const result = await dashboard.hostRequested(request, params);
            if (result.type === 'ok') {
                hostEntry.apps.push(params.caller);
                await this.allowedHosts.update(hostEntry);
            }
            return result;
        });
        this.omu.endpoints.bind(DASHBOARD_WEBVIEW_REQUEST, async (request, params): Promise<WebviewResponse> => {
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
                id,
                value: undefined,
            };
        });
        this.omu.endpoints.bind(DASHBOARD_WEBVIEW_CLOSE, async (request, params): Promise<WebviewResponse> => {
            const id = await dashboard.getWebview(request, params);
            if (!id) {
                return {
                    type: 'cancelled',
                    id: request.id,
                };
            }
            await dashboard.closeWebview(request, params);
            return {
                type: 'ok',
                id,
                value: undefined,
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

    public async requestHost(options: { host: string }): Promise<UserResponse> {
        return this.omu.endpoints.call(
            DASHBOARD_HOST_REQUEST,
            options,
        );
    }

    public async requestWebview(options: WebviewRequest): Promise<UserResult<WebviewHandle>> {
        const result = await this.omu.endpoints.call(
            DASHBOARD_WEBVIEW_REQUEST,
            options,
        );
        if (result.type !== 'ok') return new UserResult(result);
        const { id } = result;
        const eventListeners: WebviewEventListeners = {};
        const handle: WebviewHandle = {
            id,
            url: options.url,
            close: async () => {
                await this.omu.endpoints.call(
                    DASHBOARD_WEBVIEW_CLOSE,
                    { id },
                );
            },
            getCookies: async () => {
                const cookies = (await this.getCookies({
                    url: options.url,
                })).unwrap();
                return cookies;
            },
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
        return new UserResult({
            type: 'ok',
            value: handle,
        });
    }

    public async getCookies(options: GetCookiesRequest): Promise<UserResult<Cookie[]>> {
        return new UserResult(await this.omu.endpoints.call(
            DASHBOARD_COOKIES_GET,
            options,
        ));
    }

    public async openApp(app: App): Promise<void> {
        return await this.omu.endpoints.call(DASHBOARD_OPEN_APP_ENDPOINT, app);
    }

    public async installApp(app: App): Promise<AppInstallResponse> {
        return await this.omu.endpoints.call(DASHBOARD_APP_INSTALL_ENDPOINT, app);
    }

    public async updateApp(app: App): Promise<AppUpdateResponse> {
        return await this.omu.endpoints.call(DASHBOARD_APP_UPDATE_ENDPOINT, app);
    }

    public async requireDragDrop(): Promise<DragDropHandler> {
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

    public async speechRecognitionStart(): Promise<void> {
        await this.omu.endpoints.call(DASHBOARD_SPEECH_RECOGNITION_START, { type: 'start' });
    }
}

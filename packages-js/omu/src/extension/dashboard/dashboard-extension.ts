import { App } from '../../app.js';
import type { Client } from '../../client.js';
import { Identifier } from '../../identifier.js';
import { PacketType } from '../../network/packet/packet.js';
import { Serializer } from '../../serializer.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';
import type { Table } from '../table/table.js';
import { TableType } from '../table/table.js';

import type { DashboardHandler } from './dashboard.js';
import { AppInstallRequest, AppInstallResponse, AppUpdateRequest, AppUpdateResponse, DragDrop, DragDropReadRequest, DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequest, DragDropRequestDashboard, DragDropRequestResponse, DragEnter, DragLeave, DragOver, FileDragPacket, PermissionRequestPacket, PluginRequestPacket } from './packets.js';

export const DASHBOARD_EXTENSION_TYPE: ExtensionType<DashboardExtension> = new ExtensionType(
    'dashboard',
    (client: Client) => new DashboardExtension(client),
);

type DashboardSetResponse = {
    success: boolean;
};
export const DASHBOARD_SET_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('set');
const DASHBOARD_SET_ENDPOINT = EndpointType.createJson<Identifier, DashboardSetResponse>(
    DASHBOARD_EXTENSION_TYPE,
    {
        name: 'set',
        requestSerializer: Serializer.model(Identifier),
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
    requestSerializer: Serializer.model(App),
    permissionId: DASHBOARD_OPEN_APP_PERMISSION_ID,
});
const DASHBOARD_OPEN_APP_PACKET = PacketType.createJson<App>(DASHBOARD_EXTENSION_TYPE, {
    name: 'open_app',
    serializer: Serializer.model(App),
});
export const DASHOBARD_APP_READ_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'read');
export const DASHOBARD_APP_EDIT_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'edit');
const DASHBOARD_APP_TABLE_TYPE = TableType.createModel(DASHBOARD_EXTENSION_TYPE, {
    name: 'apps',
    model: App,
    permissions: {
        read: DASHOBARD_APP_READ_PERMISSION_ID,
        write: DASHOBARD_APP_EDIT_PERMISSION_ID,
        remove: DASHOBARD_APP_EDIT_PERMISSION_ID,
    },
});
export const DASHBOARD_APP_INSTALL_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'install');
const DASHBOARD_APP_INSTALL_ENDPOINT = EndpointType.createJson<App, AppInstallResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app',
    requestSerializer: Serializer.model(App),
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
    requestSerializer: Serializer.model(App),
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
})

type DragDropHandler = {
    onEnter(fn: (event: DragEnter) => unknown): void;
    onOver(fn: (event: DragOver) => unknown): void;
    onDrop(fn: (event: DragDrop) => unknown): void;
    onLeave(fn: (event: DragLeave) => unknown): void;
    read(id: string): Promise<DragDropReadResponse>;
}

export class DashboardExtension {
    public readonly type: ExtensionType<DashboardExtension> = DASHBOARD_EXTENSION_TYPE;
    private dashboard: DashboardHandler | null = null;
    private dragDropHandler: DragDropHandler | null = null;
    private dragDropListeners = {
        enter: [] as Array<(state: DragEnter) => unknown>,
        over: [] as Array<(state: DragOver) => unknown>,
        drop: [] as Array<(state: DragDrop) => unknown>,
        leave: [] as Array<(state: DragLeave) => unknown>,
    }
    public readonly apps: Table<App>;

    constructor(private readonly client: Client) {
        client.network.registerPacket(
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
        );
        client.network.addPacketHandler(DASHBOARD_PERMISSION_REQUEST_PACKET, (request) =>
            this.handlePermissionRequest(request),
        );
        client.network.addPacketHandler(DASHBOARD_PLUGIN_REQUEST_PACKET, (request) =>
            this.handlePluginRequest(request),
        );
        client.network.addPacketHandler(DASHBOARD_APP_INSTALL_PACKET, async (request) => {
            this.handleInstallApp(request);
        });
        client.network.addPacketHandler(DASHBOARD_APP_UPDATE_PACKET, async (request) => {
            this.handleUpdateApp(request);
        });
        client.network.addPacketHandler(DASHBOARD_OPEN_APP_PACKET, (app) =>
            this.handleOpenApp(app),
        );
        client.network.addPacketHandler(DASHBOARD_DRAG_DROP_REQUEST_PACKET, (request) => {
            this.handleDragDropRequest(request)
        });
        client.network.addPacketHandler(DASHBOARD_DRAG_DROP_STATE_PACKET, ({ state }) => {
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
        client.network.addPacketHandler(DASHBOARD_DRAG_DROP_READ_REQUEST_PACKET, (request) => {
            this.handleDragDropReadRequest(request);
        });
        this.apps = client.tables.get(DASHBOARD_APP_TABLE_TYPE);
    }

    private async handlePermissionRequest(request: PermissionRequestPacket): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handlePermissionRequest(request);
        if (response) {
            this.client.send(DASHBOARD_PERMISSION_ACCEPT_PACKET, request.requestId);
        } else {
            this.client.send(DASHBOARD_PERMISSION_DENY_PACKET, request.requestId);
        }
    }

    private async handlePluginRequest(request: PluginRequestPacket): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handlePluginRequest(request);
        if (response) {
            this.client.send(DASHBOARD_PLUGIN_ACCEPT_PACKET, request.requestId);
        } else {
            this.client.send(DASHBOARD_PLUGIN_DENY_PACKET, request.requestId);
        }
    }

    private async handleInstallApp(request: AppInstallRequest): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleInstallApp(request);
        if (response) {
            this.client.send(DASHBOARD_APP_INSTALL_ACCEPT_PACKET, request.requestId);
        } else {
            this.client.send(DASHBOARD_APP_INSTALL_DENY_PACKET, request.requestId);
        }
    }

    private async handleUpdateApp(request: AppUpdateRequest): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleUpdateApp(request);
        if (response) {
            this.client.send(DASHBOARD_APP_UPDATE_ACCEPT_PACKET, request.requestId);
        } else {
            this.client.send(DASHBOARD_APP_UPDATE_DENY_PACKET, request.requestId);
        }
    }

    private async handleOpenApp(app: App): Promise<void> {
        const dashboard = this.getDashboard();
        await dashboard.handleOpenApp(app);
    }

    private async handleDragDropRequest(request: DragDropRequestDashboard): Promise<void> {
        const dashboard = this.getDashboard();
        const accepted = await dashboard.handleDragDropRequest(request);
        this.client.send(DASHBOARD_DRAG_DROP_REQUEST_APPROVAL_PACKET, {
            ok: accepted,
            request_id: request.request_id,
        });
    }

    private async handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<void> {
        const dashboard = this.getDashboard();
        const response = await dashboard.handleDragDropReadRequest(request);
        this.client.send(DASHBOARD_DRAG_DROP_READ_RESPONSE_PACKET, response);
    }

    private getDashboard(): DashboardHandler {
        if (this.dashboard === null) {
            throw new Error('Dashboard not set');
        }
        return this.dashboard;
    }

    public set(dashboard: DashboardHandler): void {
        this.client.permissions.require(DASHBOARD_SET_PERMISSION_ID);
        if (this.dashboard !== null) {
            throw new Error('Dashboard already set');
        }
        this.dashboard = dashboard;
        this.client.onReady(async () => {
            const response = await this.client.endpoints.call(
                DASHBOARD_SET_ENDPOINT,
                this.client.app.id,
            );
            if (!response.success) {
                throw new Error('Failed to set dashboard');
            }
        });
    }

    public async openApp(app: App): Promise<void> {
        return await this.client.endpoints.call(DASHBOARD_OPEN_APP_ENDPOINT, app);
    }

    public async installApp(app: App): Promise<AppInstallResponse> {
        return await this.client.endpoints.call(DASHBOARD_APP_INSTALL_ENDPOINT, app);
    }

    public async updateApp(app: App): Promise<AppUpdateResponse> {
        return await this.client.endpoints.call(DASHBOARD_APP_UPDATE_ENDPOINT, app);
    }

    public async requireDragDrop(): Promise<DragDropHandler> {
        await this.client.endpoints.call(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, {});
        const listeners = this.dragDropListeners;
        const client = this.client;
        this.dragDropHandler = {
            onEnter(fn) { listeners.enter.push(fn); },
            onOver(fn) { listeners.over.push(fn); },
            onDrop(fn) { listeners.drop.push(fn); },
            onLeave(fn) { listeners.leave.push(fn); },
            async read(id) { return await client.endpoints.call(DASHBOARD_DRAG_DROP_READ_ENDPOINT, { drag_id: id }); },
        }
        return this.dragDropHandler
    }

    public async notifyDropDragState(packet: FileDragPacket): Promise<void> {
        this.client.send(DASHBOARD_DRAG_DROP_STATE_PACKET, packet);
    }
}

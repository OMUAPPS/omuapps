import type { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { InvokedParams } from '../endpoint/packets.js';
import { Cookie, GetCookiesRequest, HostRequest, UserResponse, WebviewEvent, WebviewPacket, WebviewRequest } from './extension.js';

import type { AppInstallRequest, AppUpdateRequest, DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequestDashboard, PermissionRequestPacket, PluginRequestPacket } from './packets.js';

export interface DashboardHandler {
    handlePermissionRequest(request: PermissionRequestPacket): Promise<boolean>;
    handlePluginRequest(request: PluginRequestPacket): Promise<boolean>;
    handleInstallApp(request: AppInstallRequest): Promise<boolean>;
    handleUpdateApp(request: AppUpdateRequest): Promise<boolean>;
    handleOpenApp(app: App): Promise<void>;
    handleDragDropRequest(request: DragDropRequestDashboard): Promise<boolean>;
    handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<DragDropReadResponse>;
    getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>>;
    hostRequested(request: HostRequest, params: InvokedParams): Promise<UserResponse>;
    createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier>;
    getWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
}

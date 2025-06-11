import type { App } from '../../app.js';

import type { AppInstallRequest, AppUpdateRequest, DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequestDashboard, PermissionRequestPacket, PluginRequestPacket } from './packets.js';

export interface DashboardHandler {
    handlePermissionRequest(request: PermissionRequestPacket): Promise<boolean>;
    handlePluginRequest(request: PluginRequestPacket): Promise<boolean>;
    handleInstallApp(request: AppInstallRequest): Promise<boolean>;
    handleUpdateApp(request: AppUpdateRequest): Promise<boolean>;
    handleOpenApp(app: App): Promise<void>;
    handleDragDropRequest(request: DragDropRequestDashboard): Promise<boolean>;
    handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<DragDropReadResponse>;
}

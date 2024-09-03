import type { App } from '../../app.js';

import type { AppInstallRequest, AppUpdateRequest, PermissionRequestPacket, PluginRequestPacket } from './packets.js';

export interface DashboardHandler {
    handlePermissionRequest(request: PermissionRequestPacket): Promise<boolean>;
    handlePluginRequest(request: PluginRequestPacket): Promise<boolean>;
    handleInstallApp(request: AppInstallRequest): Promise<boolean>;
    handleUpdateApp(request: AppUpdateRequest): Promise<boolean>;
    handleOpenApp(app: App): Promise<void>;
}

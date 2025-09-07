export {
    Cookie, DASHBOARD_APP_INSTALL_PERMISSION_ID, DAShBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID, DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID, DASHBOARD_WEBVIEW_PERMISSION_ID, DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID, GetCookiesRequest, HostRequest, UserResponse, WebviewPacket, WebviewRequest, type TranscriptResult, type TranscriptSegment,
} from './extension.js';
export type { DashboardHandler } from './handler';
export {
    AppInstallRequest,
    AppUpdateRequest, DragDropFile, DragDropReadRequestDashboard,
    DragDropReadResponse, DragDropRequestDashboard, FileData, PermissionRequestPacket,
    PluginRequestPacket,
} from './packets.js';


export {
    DASHBOARD_APP_CLOSE_PERMISSION_ID,
    DASHBOARD_APP_INSTALL_ENDPOINT,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_APP_STARTUP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_ENDPOINT,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_STARTUP_APPS,
} from './apps.js';
export {
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_PROMPT_CLEAR_BLOCKED,
    DASHBOARD_SET_ENDPOINT,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    type HostRequest,
    type SpeechRecognitionStart,
    type TranscriptSegment,
    type TranscriptStatus,
    type UserResponse,
} from './constants.js';
export {
    DASHBOARD_OPEN_APP_PACKET,
    DASHBOARD_PROMPT_REQUEST,
    DASHBOARD_PROMPT_RESPONSE,
    type AppInstallResponse,
    type PortProcess,
    type PromptRequest,
    type PromptRequestAppInstall,
    type PromptRequestAppPermissions,
    type PromptRequestAppPlugins,
    type PromptRequestAppUpdate,
    type PromptRequestHttpPort,
    type PromptRequestIndexInstall,
    type PromptResponse,
    type PromptResult,
} from './packets.js';
export {
    CookieList,
    DASHBOARD_ALLOWED_WEBVIEW_HOSTS,
    DASHBOARD_WEBVIEW_EVENT_PACKET,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    type Cookie,
    type GetCookiesRequest,
    type WebviewEvent,
    type WebviewEventPacket,
    type WebviewHandle,
    type WebviewPacket,
    type WebviewRequest,
} from './webview.js';

export {
    DASHBOARD_DRAG_DROP_READ_ENDPOINT,
    DASHBOARD_DRAG_DROP_STATE_PACKET,
    DragDropReadResponse,
    type DragDropFile,
    type DragDropReadRequest,
    type DragDropRequestDashboard,
    type FileData,
    type FileDragPacket,
} from './dragdrop.js';

export type { DashboardHandler } from './handler';

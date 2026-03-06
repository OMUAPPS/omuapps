export {
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
} from './apps.js';
export {
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    type HostRequest,
    type SpeechRecognitionStart,
    type TranscriptSegment,
    type TranscriptStatus,
    type UserResponse,
} from './constants.js';
export {
    type PortProcess,
    type PromptRequest,
    type PromptRequestAppInstall,
    type PromptRequestAppPermissions,
    type PromptRequestAppPlugins,
    type PromptRequestAppUpdate,
    type PromptRequestHttpPort,
    type PromptRequestIndexInstall,
    type PromptResult,
} from './packets.js';
export {
    CookieList,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    type Cookie,
    type GetCookiesRequest,
    type WebviewEvent,
    type WebviewHandle,
    type WebviewPacket,
    type WebviewRequest,
} from './webview.js';

export {
    DragDropReadResponse,
    type DragDropFile,
    type DragDropReadRequest,
    type DragDropRequestDashboard,
    type FileData,
} from './dragdrop.js';

export type { DashboardHandler } from './handler';

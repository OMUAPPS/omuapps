import type { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { InvokedParams } from '../endpoint/packets.js';
import { Cookie, GetCookiesRequest, HostRequest, PromptRequestAppInstall, PromptRequestAppPermissions, PromptRequestAppPlugins, PromptRequestAppUpdate, PromptResult, SpeechRecognitionStart, UserResponse, WebviewEvent, WebviewPacket, WebviewRequest } from './extension.js';

import type { DragDropReadRequestDashboard, DragDropReadResponse, DragDropRequestDashboard } from './packets.js';

export interface DashboardHandler {
    handlePermissionRequest(request: PromptRequestAppPermissions): Promise<PromptResult>;
    handlePluginRequest(request: PromptRequestAppPlugins): Promise<PromptResult>;
    handleInstallApp(request: PromptRequestAppInstall): Promise<PromptResult>;
    handleUpdateApp(request: PromptRequestAppUpdate): Promise<PromptResult>;
    handleOpenApp(app: App): Promise<void>;
    handleDragDropRequest(request: DragDropRequestDashboard): Promise<boolean>;
    handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<DragDropReadResponse>;
    getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>>;
    hostRequested(request: HostRequest, params: InvokedParams): Promise<UserResponse>;
    createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier>;
    getWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    speechRecognitionStart(request: SpeechRecognitionStart, params: InvokedParams): Promise<UserResponse<undefined>>;
}

import type { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { InvokedParams } from '../endpoint/packets.js';
import { Cookie, GetCookiesRequest, HostRequest, PromptRequestAppInstall, PromptRequestAppPermissions, PromptRequestAppPlugins, PromptRequestAppUpdate, PromptRequestHttpPort, PromptRequestIndexInstall, PromptResult, SpeechRecognitionStart, UserResponse, WebviewEvent, WebviewPacket, WebviewRequest } from './extension.js';

import type { DragDropReadRequest, DragDropReadResponse, DragDropRequestDashboard } from './packets.js';

export interface DashboardHandler {
    handlePermissionRequest(request: PromptRequestAppPermissions): Promise<PromptResult>;
    handlePluginRequest(request: PromptRequestAppPlugins): Promise<PromptResult>;
    handleInstallApp(request: PromptRequestAppInstall): Promise<PromptResult>;
    handleUpdateApp(request: PromptRequestAppUpdate): Promise<PromptResult>;
    handleIndexInstall(request: PromptRequestIndexInstall): Promise<PromptResult>;
    handleHttpPortRequest(request: PromptRequestHttpPort): Promise<PromptResult>;
    handleOpenApp(app: App): Promise<void>;
    handleDragDropRequest(request: DragDropRequestDashboard, params: InvokedParams): Promise<boolean>;
    handleDragDropReadRequest(request: DragDropReadRequest, params: InvokedParams): Promise<DragDropReadResponse>;
    handleHostRequest(request: HostRequest, params: InvokedParams): Promise<PromptResult>;
    getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>>;
    createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier>;
    getWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    speechRecognitionStart(request: SpeechRecognitionStart, params: InvokedParams): Promise<UserResponse<undefined>>;
}

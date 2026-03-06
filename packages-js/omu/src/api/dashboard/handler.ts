import type { App } from '../../app.js';
import { Identifier } from '../../identifier';
import { InvokedParams } from '../endpoint/packets.js';
import { HostRequest, SpeechRecognitionStart, UserResponse } from './constants.js';

import { DragDropReadRequest, DragDropReadResponse, DragDropRequestDashboard } from './dragdrop.js';
import type { PromptRequestAppInstall, PromptRequestAppPermissions, PromptRequestAppPlugins, PromptRequestAppUpdate, PromptRequestHttpPort, PromptRequestIndexInstall, PromptResult } from './packets.js';
import { Cookie, GetCookiesRequest, WebviewEvent, WebviewPacket, WebviewRequest } from './webview.js';

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
    openApp(...apps: App[]): Promise<void>;
    getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>>;
    createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier>;
    getWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined>;
    speechRecognitionStart(request: SpeechRecognitionStart, params: InvokedParams): Promise<UserResponse<undefined>>;
    closeApp(id: Identifier): Promise<void>;
}

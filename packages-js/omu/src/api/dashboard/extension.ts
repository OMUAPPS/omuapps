import { App } from '../../app.js';
import { Omu } from '../../omu.js';
import { PromiseResult } from '../../result.js';
import { ExtensionType } from '../extension.js';
import { Registry } from '../registry/registry.js';
import { DashboardApps } from './apps.js';
import { DASHBOARD_EXTENSION_TYPE, DASHBOARD_PROMPT_CLEAR_BLOCKED, DASHBOARD_SET_ENDPOINT, DASHBOARD_SET_PERMISSION_ID, DASHBOARD_SPEECH_RECOGNITION, DASHBOARD_SPEECH_RECOGNITION_START, TranscriptStatus, UserError, UserResponse } from './constants.js';
import { DragDropAPI, DragDropHandler, FileDragPacket } from './dragdrop.js';

import type { DashboardHandler } from './handler.js';
import { DASHBOARD_OPEN_APP_PACKET, DASHBOARD_PROMPT_REQUEST, DASHBOARD_PROMPT_RESPONSE, PromptRequest, PromptResult } from './packets.js';
import { GetCookiesRequest, WebviewAPI, WebviewHandle, WebviewRequest } from './webview.js';

export { DASHBOARD_EXTENSION_TYPE };

export class DashboardExtension {
    public readonly type: ExtensionType<DashboardExtension> = DASHBOARD_EXTENSION_TYPE;
    private dashboard: DashboardHandler | null = null;
    public readonly speechRecognition: Registry<TranscriptStatus>;
    private readonly webview: WebviewAPI;
    private readonly dragdrop: DragDropAPI;
    public readonly apps: DashboardApps;

    constructor(private readonly omu: Omu) {
        this.webview = new WebviewAPI(omu);
        this.dragdrop = new DragDropAPI(omu);
        this.apps = new DashboardApps(omu);
        omu.network.registerPacket(
            DASHBOARD_OPEN_APP_PACKET,
            DASHBOARD_PROMPT_REQUEST,
            DASHBOARD_PROMPT_RESPONSE,
        );
        omu.network.addPacketHandler(DASHBOARD_PROMPT_REQUEST, (request) => {
            this.handlePromptRequest(request);
        });
        omu.network.addPacketHandler(DASHBOARD_OPEN_APP_PACKET, (app) => {
            this.handleOpenApp(app);
        });
        this.speechRecognition = omu.registries.get(DASHBOARD_SPEECH_RECOGNITION);
    }

    private async executeRequestForDashboard(request: PromptRequest): Promise<PromptResult> {
        const dashboard = this.getDashboard();
        switch (request.kind) {
            case 'app/permissions':
                return await dashboard.handlePermissionRequest(request);
            case 'app/plugins':
                return await dashboard.handlePluginRequest(request);
            case 'app/install':
                return await dashboard.handleInstallApp(request);
            case 'app/update':
                return await dashboard.handleUpdateApp(request);
            case 'index/install':
                return await dashboard.handleIndexInstall(request);
            case 'http/port':
                return await dashboard.handleHttpPortRequest(request);
            default:
                throw new Error(`Unknown prompt requested: ${JSON.stringify(request)}`);
        }
    }

    private async handlePromptRequest(request: PromptRequest): Promise<void> {
        const response = await this.executeRequestForDashboard(request);
        this.omu.send(DASHBOARD_PROMPT_RESPONSE, {
            id: request.id,
            kind: request.kind,
            result: response,
        });
    }

    private async handleOpenApp(app: App): Promise<void> {
        const dashboard = this.getDashboard();
        await dashboard.handleOpenApp(app);
    }

    private getDashboard(): DashboardHandler {
        if (this.dashboard === null) {
            throw new Error('Dashboard not set');
        }
        return this.dashboard;
    }

    public set(dashboard: DashboardHandler): void {
        this.omu.permissions.require(DASHBOARD_SET_PERMISSION_ID);
        if (this.dashboard !== null) {
            throw new Error('Dashboard already set');
        }
        this.dashboard = dashboard;

        this.webview.setDashboard(dashboard);
        this.dragdrop.setDashboard(dashboard);
        this.apps.setDashboard(dashboard);
        this.omu.network.addTask(async () => {
            const response = await this.omu.endpoints.call(
                DASHBOARD_SET_ENDPOINT,
                this.omu.app.id,
            );
            if (!response.success) {
                throw new Error('Failed to set dashboard');
            }
        });
        this.omu.endpoints.bind(DASHBOARD_SPEECH_RECOGNITION_START, async (request, params): Promise<UserResponse<undefined>> => {
            const result = await dashboard.speechRecognitionStart(request, params);
            return result;
        });
    }

    public requestWebview(options: WebviewRequest): PromiseResult<WebviewHandle, UserError> {
        return this.webview.requestWebview(options);
    }

    public getCookies(options: GetCookiesRequest): PromiseResult<CookieList, UserError> {
        return this.webview.getCookies(options);
    }

    public async clearBlockedPrompts(): Promise<null> {
        return await this.omu.endpoints.call(DASHBOARD_PROMPT_CLEAR_BLOCKED, null);
    }

    public async requestDragDrop(): Promise<DragDropHandler> {
        return this.dragdrop.requestDragDrop();
    }

    public async notifyDropDragState(packet: FileDragPacket): Promise<void> {
        return this.dragdrop.notifyDropDragState(packet);
    }

    public requestSpeechRecognition(): PromiseResult<Registry<TranscriptStatus>, UserError> {
        const { promise, resolve, reject } = PromiseResult.create<Registry<TranscriptStatus>, UserError>();
        this.omu.endpoints.call(DASHBOARD_SPEECH_RECOGNITION_START, { type: 'start' }).then((result) => {
            if (result.type === 'ok') {
                resolve(this.speechRecognition);
            } else {
                reject(result);
            }
        });
        return promise;
    }
}

import { currentPage, speechRecognition } from '$lib/main/settings.js';
import PermissionRequestScreen from '$lib/screen/PermissionRequestScreen.svelte';
import PluginRequestScreen from '$lib/screen/PluginRequestScreen.svelte';
import { appWindow, invoke, tauriFs, tauriPath, type Cookie } from '$lib/tauri.js';
import { App, Identifier, IdentifierMap, Omu } from '@omujs/omu';
import {
    DragDropReadResponse,
    type AppInstallRequest,
    type AppUpdateRequest,
    type DashboardHandler,
    type DragDropReadRequestDashboard,
    type DragDropRequestDashboard,
    type FileData,
    type GetCookiesRequest,
    type HostRequest,
    type PermissionRequestPacket,
    type PluginRequestPacket,
    type SpeechRecognitionStart,
    type TranscriptSegment,
    type UserResponse,
    type WebviewEvent,
    type WebviewPacket,
    type WebviewRequest,
} from '@omujs/omu/api/dashboard';
import type { InvokedParams } from '@omujs/omu/api/endpoint';
import type { Table } from '@omujs/omu/api/table';
import type { Locale } from '@omujs/omu/localization';
import { Webview } from '@tauri-apps/api/webview';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Window } from '@tauri-apps/api/window';
import { get } from 'svelte/store';
import { dragDropApps, dragDrops } from './dragdrop.js';
import AppInstallRequestScreen from './screen/AppInstallRequestScreen.svelte';
import AppUpdateRequestScreen from './screen/AppUpdateRequestScreen.svelte';
import HostRequestScreen from './screen/HostRequestScreen.svelte';
import { screenContext } from './screen/screen.js';
import SpeechRecognitionScreen from './screen/SpeechRecognitionScreen.svelte';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:dashboard');

export class Dashboard implements DashboardHandler {
    public currentApp: App | null = null;
    readonly apps: Table<App>;
    readonly webviewHandles: IdentifierMap<{
        id: Identifier;
        close: () => void;
    }> = new IdentifierMap();
    private recognition: SpeechRecognition | undefined;

    constructor(private readonly omu: Omu) {
        this.apps = omu.dashboard.apps;
        omu.dashboard.set(this);
        omu.onReady(() => {
            omu.i18n.setLocale(window.navigator.languages as Locale[]);
        });
        this.apps.event.add.listen(() => {
            appWindow.setFocus();
        });
    }

    async speechRecognitionStart(request: SpeechRecognitionStart, params: InvokedParams): Promise<UserResponse<undefined>> {
        if (this.recognition) return { type: 'ok', value: undefined };
        const accepted = get(speechRecognition) || await new Promise<boolean>((resolve) => {
            screenContext.push(SpeechRecognitionScreen, {
                resolve: (accept: boolean) => resolve(accept),
            });
        });
        if (!accepted) return { type: 'cancelled' };
        speechRecognition.set(true);
        await navigator.permissions.query({ name: 'microphone' });
        const recognition = this.recognition = new (SpeechRecognition || webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.lang = navigator.language;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onerror = ({ error }) => {
            if (error === 'no-speech') return;
            console.error('Speech recognition error:', error);
        };
        let timestamp = Date.now();
        recognition.onresult = async ({ results }) => {
            const segments: TranscriptSegment[] = [...results]
                .map((result) => {
                    return [...result].map(({ confidence, transcript }): TranscriptSegment => ({ confidence, transcript }));
                })
                .flatMap((result) => [...result]);
            await this.omu.dashboard.speechRecognition.set({
                type: results[results.length - 1].isFinal ? 'final' : 'result',
                timestamp,
                segments: segments,
            });
        };
        recognition.onsoundstart = async () => {
            timestamp = Date.now();
            await this.omu.dashboard.speechRecognition.set({
                type: 'audio_started',
                timestamp,
            });
        };
        recognition.onsoundend = async () => {
            await this.omu.dashboard.speechRecognition.set({
                type: 'audio_ended',
                timestamp,
            });
        };
        recognition.onend = () => {
            recognition.start();
        };
        recognition.start();
        return {
            type: 'ok',
            value: undefined,
        };
    }

    async handlePermissionRequest(request: PermissionRequestPacket): Promise<boolean> {
        await appWindow.setFocus();
        return new Promise<boolean>((resolve) => {
            screenContext.push(PermissionRequestScreen, {
                request,
                resolve: (accept: boolean) => resolve(accept),
            });
        });
    }

    async handlePluginRequest(request: PluginRequestPacket): Promise<boolean> {
        await appWindow.setFocus();
        return new Promise<boolean>((resolve) => {
            screenContext.push(PluginRequestScreen, {
                request,
                resolve: (accept: boolean) => resolve(accept),
            });
        });
    }

    async handleInstallApp(request: AppInstallRequest): Promise<boolean> {
        await appWindow.setFocus();
        return new Promise<boolean>((resolve) => {
            screenContext.push(AppInstallRequestScreen, {
                request,
                resolve: (accept: boolean) => resolve(accept),
            });
        });
    }

    async handleUpdateApp(request: AppUpdateRequest): Promise<boolean> {
        await appWindow.setFocus();
        return new Promise<boolean>((resolve) => {
            screenContext.push(AppUpdateRequestScreen, {
                request,
                resolve: (accept: boolean) => resolve(accept),
            });
        });
    }

    async handleOpenApp(app: App): Promise<void> {
        console.log('Open app', app);
        currentPage.update(() => `app-${app.id.key()}`);
    }

    async handleDragDropRequest(request: DragDropRequestDashboard): Promise<boolean> {
        dragDropApps.push(request.app.id);
        return true;
    }

    async handleDragDropReadRequest(request: DragDropReadRequestDashboard): Promise<DragDropReadResponse> {
        const dragDrop = dragDrops[request.drag_id];
        if (!dragDrop) {
            return new DragDropReadResponse({ drag_id: request.drag_id, request_id: request.request_id, files: [] }, {});
        }
        const files: Record<string, FileData> = {};
        for (const [index, path] of dragDrop.paths.entries()) {
            const name = await tauriPath.basename(path);
            files[name] = {
                file: dragDrop.files[index],
                buffer: await tauriFs.readFile(path),
            };
        }
        return new DragDropReadResponse(
            {
                ...request,
                files: dragDrop.files,
            },
            files,
        );
    }

    async getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>> {
        const cookies = await invoke('get_cookies', { options: {
            label: appWindow.label,
            url: request.url,
        } });
        return {
            type: 'ok',
            value: cookies,
        };
    }

    async hostRequested(request: HostRequest, params: InvokedParams): Promise<UserResponse> {
        await appWindow.setFocus();
        const app = await this.apps.get(params.caller.key());
        if (!app) {
            console.warn('App not found for host request', params.caller);
            return { type: 'cancelled' };
        }
        return new Promise<UserResponse>((resolve) => {
            screenContext.push(HostRequestScreen, {
                request,
                app,
                resolve: (response: UserResponse) => resolve(response),
            });
        });
    }

    async createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier> {
        const { url, script } = request;
        const uri = new URL(url);
        if (!['https:', 'http:'].includes(uri.protocol)) throw new Error('Invalid URL protocol');
        const label = `webview-${Math.floor(performance.timeOrigin * 1000)}-${this.webviewHandles.size}-${Math.floor(performance.now() * 10000)}`;
        const id = params.caller.join(label);
        this.webviewHandles.set(id, {
            id,
            close: () => {
                webviewWindow?.destroy();
            },
        });
        const existingWebviewWindow = await WebviewWindow.getByLabel(label);
        existingWebviewWindow?.destroy();
        const existingWebview = await Webview.getByLabel(label);
        existingWebview?.close();
        const existingWindow = await Window.getByLabel(label);
        existingWindow?.close();
        await invoke('create_webview_window', { options: {
            script,
            url,
            label,
        } });
        const webviewWindow = await WebviewWindow.getByLabel(label);
        if (!webviewWindow) {
            throw new Error('Webview not found');
        }
        webviewWindow.once('tauri://close-requested', async () => {
            this.webviewHandles.delete(id);
            await emit({ type: 'closed' });
        });
        return id;
    }

    async getWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined> {
        if (!request.id.isSubpathOf(params.caller)) return;
        const handle = this.webviewHandles.get(request.id);
        return handle?.id;
    }

    async closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined> {
        if (!request.id.isSubpathOf(params.caller)) return;
        const handle = this.webviewHandles.get(request.id);
        return handle?.id;
    }
}

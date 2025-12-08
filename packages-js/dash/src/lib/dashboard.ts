import PermissionRequestScreen from '$lib/screen/ScreenRequestPermission.svelte';
import PluginRequestScreen from '$lib/screen/ScreenRequestPlugin.svelte';
import { currentPage, speechRecognition } from '$lib/settings.js';
import { appWindow, type Cookie } from '$lib/tauri.js';
import { Identifier, IdentifierMap, type App, type Omu } from '@omujs/omu';
import {
    DragDropReadResponse,
    type DashboardHandler,
    type DragDropReadRequestDashboard,
    type DragDropRequestDashboard,
    type FileData,
    type GetCookiesRequest,
    type HostRequest,
    type PromptRequestAppInstall,
    type PromptRequestAppPermissions,
    type PromptRequestAppPlugins,
    type PromptRequestAppUpdate,
    type PromptRequestHttpPort,
    type PromptRequestIndexInstall,
    type PromptResult,
    type TranscriptSegment,
    type UserResponse,
    type WebviewEvent,
    type WebviewPacket,
    type WebviewRequest,
} from '@omujs/omu/api/dashboard';
import type { InvokedParams } from '@omujs/omu/api/endpoint';
import { invoke } from '@tauri-apps/api/core';
import { basename } from '@tauri-apps/api/path';
import { Webview } from '@tauri-apps/api/webview';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Window } from '@tauri-apps/api/window';
import { readFile } from '@tauri-apps/plugin-fs';
import { get } from 'svelte/store';
import { dragDropApps, dragDrops } from './dragdrop.js';
import AppInstallRequestScreen from './screen/ScreenRequestAppInstall.svelte';
import AppUpdateRequestScreen from './screen/ScreenRequestAppUpdate.svelte';
import HostRequestScreen from './screen/ScreenRequestHost.svelte';
import ScreenRequestHttpPort from './screen/ScreenRequestHttpPort.svelte';
import ScreenRequestIndexInstall from './screen/ScreenRequestIndexInstall.svelte';
import SpeechRecognitionScreen from './screen/ScreenRequestSpeechRecognition.svelte';
import { pushScreen, screenEntries } from './screen/screen.js';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:dashboard');

export class Dashboard implements DashboardHandler {
    public currentApp: App | null = null;
    readonly webviewHandles: IdentifierMap<{
        id: Identifier;
        close: () => void;
    }> = new IdentifierMap();
    private recognition: SpeechRecognition | undefined;

    constructor(private readonly omu: Omu) {
        omu.dashboard.set(this);
        omu.server.apps.event.remove.listen((apps) => {
            screenEntries.update((screens) => {
                for (const id of apps.keys()) {
                    screens = screens.filter((entry) => entry.target === `app-${id}`);
                }
                return screens;
            });
        });
        currentPage.subscribe(() => {
            this.currentApp = null;
        });
    }

    async speechRecognitionStart(): Promise<UserResponse<undefined>> {
        if (this.recognition) return { type: 'ok', value: undefined };
        const accepted = get(speechRecognition) || await new Promise<boolean>((resolve) => {
            pushScreen(SpeechRecognitionScreen, 'settings', {
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

    async handlePermissionRequest(request: PromptRequestAppPermissions): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(PermissionRequestScreen, `app-${request.app.id}`, {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handlePluginRequest(request: PromptRequestAppPlugins): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(PluginRequestScreen, `app-${request.app.id}`, {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handleInstallApp(request: PromptRequestAppInstall): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(AppInstallRequestScreen, 'explore', {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handleUpdateApp(request: PromptRequestAppUpdate): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(AppUpdateRequestScreen, `app-${request.old_app.id}`, {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handleIndexInstall(request: PromptRequestIndexInstall): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(ScreenRequestIndexInstall, 'explore', {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handleHttpPortRequest(request: PromptRequestHttpPort): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        return new Promise<PromptResult>((resolve) => {
            pushScreen(ScreenRequestHttpPort, `app-${request.app.id}`, {
                request,
                resolve: (result: PromptResult) => resolve(result),
            });
        });
    }

    async handleHostRequest(request: HostRequest, params: InvokedParams): Promise<PromptResult> {
        await appWindow.show();
        await appWindow.setFocus();
        const app = await this.omu.server.apps.get(params.caller.key());
        if (!app) {
            console.warn('App not found for host request', params.caller);
            return 'deny';
        }
        return new Promise<PromptResult>((resolve) => {
            pushScreen(HostRequestScreen, `app-${app.id.key()}`, {
                request,
                app,
                resolve: (response: PromptResult) => resolve(response),
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
            const name = await basename(path);
            files[name] = {
                file: dragDrop.files[index],
                buffer: await readFile(path),
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
        const id = Identifier.fromKey(request.id);
        if (!id.isSubpathOf(params.caller)) return;
        const handle = this.webviewHandles.get(id);
        return handle?.id;
    }

    async closeWebview(request: WebviewPacket, params: InvokedParams): Promise<Identifier | undefined> {
        const id = Identifier.fromKey(request.id);
        if (!id.isSubpathOf(params.caller)) return;
        const handle = this.webviewHandles.get(id);
        return handle?.id;
    }
}

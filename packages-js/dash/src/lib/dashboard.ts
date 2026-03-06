import ScreenRequestPermission from '$lib/screen/ScreenRequestPermission.svelte';
import ScreenRequestPlugin from '$lib/screen/ScreenRequestPlugin.svelte';
import ScreenRequestAppInstall from './screen/ScreenRequestAppInstall.svelte';
import ScreenRequestAppUpdate from './screen/ScreenRequestAppUpdate.svelte';
import ScreenRequestHost from './screen/ScreenRequestHost.svelte';
import ScreenRequestHttpPort from './screen/ScreenRequestHttpPort.svelte';
import ScreenRequestIndexInstall from './screen/ScreenRequestIndexInstall.svelte';
import ScreenRequestSpeechRecognition from './screen/ScreenRequestSpeechRecognition.svelte';

import { currentPage, speechRecognition } from '$lib/settings.js';
import { appWindow, type WebviewMessage } from '$lib/tauri.js';
import { Identifier, IdentifierMap, type App, type Omu } from '@omujs/omu';
import {
    DragDropReadResponse,
    type Cookie,
    type DashboardHandler,
    type DragDropReadRequest,
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
import { closePage, loadPage, registerPage } from './main/page';
import PageApp from './pages/PageApp.svelte';
import { pushScreen, screenEntries, type ScreenComponentType } from './screen/screen.js';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:dashboard');

export class Dashboard implements DashboardHandler {
    public currentApp: App | null = null;
    private readonly webviewHandles: IdentifierMap<{
        id: Identifier;
        close: () => void;
    }> = new IdentifierMap();
    private readonly messageHandlers: Map<string, (event: WebviewMessage) => void> = new Map();
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

    public processWebviewMessage(event: WebviewMessage) {
        const handle = this.messageHandlers.get(event.label);
        if (!handle) return;
        handle(event);
    }

    async speechRecognitionStart(): Promise<UserResponse<undefined>> {
        if (this.recognition) return { type: 'ok', value: undefined };

        const accepted = get(speechRecognition) || await new Promise<boolean>((resolve) => {
            pushScreen(ScreenRequestSpeechRecognition, 'settings', {
                resolve: (accept: boolean) => resolve(accept),
            });
        });

        if (!accepted) return { type: 'cancelled' };

        speechRecognition.set(true);
        await navigator.permissions.query({ name: 'microphone' as PermissionName });

        const Recognizer = typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : (typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : undefined);
        if (!Recognizer) return { type: 'cancelled' };

        const recognition = this.recognition = new (Recognizer)();
        recognition.continuous = false;
        recognition.lang = navigator.language;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onerror = ({ error }: { error: string }) => {
            if (error === 'no-speech') return;
            console.error('Speech recognition error:', error);
        };

        let timestamp = Date.now();

        recognition.onresult = async ({ results }: { results: SpeechRecognitionResultList }) => {
            const segments: TranscriptSegment[] = Array.from(results)
                .flatMap((result) => Array.from(result).map(({ confidence, transcript }) => ({ confidence, transcript })));
            await this.omu.dashboard.speechRecognition.set({
                type: results[results.length - 1].isFinal ? 'final' : 'result',
                timestamp,
                segments,
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

        return { type: 'ok', value: undefined };
    }

    private async showAppWindow() {
        await appWindow.show();
        await appWindow.setFocus();
    }

    async handlePermissionRequest(request: PromptRequestAppPermissions): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestPermission, `app-${request.app.id}`, { request });
    }

    async handlePluginRequest(request: PromptRequestAppPlugins): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestPlugin, `app-${request.app.id}`, { request });
    }

    async handleInstallApp(request: PromptRequestAppInstall): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestAppInstall, 'explore', { request });
    }

    async handleUpdateApp(request: PromptRequestAppUpdate): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestAppUpdate, `app-${request.old_app.id}`, { request });
    }

    async handleIndexInstall(request: PromptRequestIndexInstall): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestIndexInstall, 'explore', { request });
    }

    async handleHttpPortRequest(request: PromptRequestHttpPort): Promise<PromptResult> {
        await this.showAppWindow();
        return this.showPrompt(ScreenRequestHttpPort, `app-${request.app.id}`, { request });
    }

    async handleHostRequest(request: HostRequest, params: InvokedParams): Promise<PromptResult> {
        await this.showAppWindow();
        const app = await this.omu.server.apps.get(params.caller.key());
        if (!app) {
            console.warn('App not found for host request', params.caller);
            return 'deny';
        }
        return this.showPrompt(ScreenRequestHost, `app-${app.id.key()}`, { request, app });
    }

    async handleOpenApp(app: App): Promise<void> {
        currentPage.update(() => `app-${app.id.key()}`);
    }

    async openApp(...apps: App[]): Promise<void> {
        for (const app of apps) {
            const page = registerPage<{ app: App }>({
                id: `app-${app.id.key()}`,
                component: PageApp,
                data: {
                    app,
                },
            });
            loadPage(page.id, page);
        }
    }

    async closeApp(id: Identifier): Promise<void> {
        closePage(`app-${id.key()}`);
    }

    async handleDragDropRequest(request: DragDropRequestDashboard, params: InvokedParams): Promise<boolean> {
        dragDropApps.push(params.caller.key());
        return true;
    }

    async handleDragDropReadRequest(request: DragDropReadRequest): Promise<DragDropReadResponse> {
        const dragDrop = dragDrops[request.drag_id];
        if (!dragDrop) {
            return new DragDropReadResponse({ drag_id: request.drag_id, files: [] }, {});
        }

        const files: Record<string, FileData> = {};
        for (const [index, path] of dragDrop.paths.entries()) {
            const name = await basename(path);
            files[name] = {
                file: dragDrop.files[index],
                buffer: await readFile(path),
            };
        }

        return new DragDropReadResponse({ ...request, files: dragDrop.files }, files);
    }

    async getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>> {
        const cookies = await invoke('get_cookies', {
            options: {
                label: appWindow.label,
                url: request.url,
            },
        });
        return { type: 'ok', value: cookies };
    }

    async createWebview(request: WebviewRequest, params: InvokedParams, emit: (event: WebviewEvent) => Promise<void>): Promise<Identifier> {
        const uri = new URL(request.url);
        if (!['https:', 'http:'].includes(uri.protocol)) throw new Error('Invalid URL protocol');

        const label = `webview-${Math.floor(performance.timeOrigin * 1000)}-${this.webviewHandles.size}-${Math.floor(performance.now() * 10000)}`;
        const id = params.caller.join(label);

        const existingWebviewWindow = await WebviewWindow.getByLabel(label);
        existingWebviewWindow?.destroy();
        const existingWebview = await Webview.getByLabel(label);
        existingWebview?.close();
        const existingWindow = await Window.getByLabel(label);
        existingWindow?.close();

        await invoke('create_webview_window', { options: {
            ...request,
            label,
        } });

        const webviewWindow = await WebviewWindow.getByLabel(label);
        if (!webviewWindow) throw new Error('Webview not found');

        const close = async () => {
            this.webviewHandles.delete(id);
            this.messageHandlers.delete(label);
            await emit({ type: 'closed' });
            await webviewWindow.close();
            await webviewWindow.destroy();
        };

        webviewWindow.once('tauri://close-requested', () => close());
        webviewWindow.listen('tauri://resize', async () => {
            const size = await webviewWindow.size();
            await emit({ type: 'resize', dimensions: { x: size.width, y: size.height } });
        });
        webviewWindow.listen('message', async (event) => {
            await emit({ type: 'message', data: event.payload });
        });

        this.webviewHandles.set(id, { id, close: () => close() });
        this.messageHandlers.set(label, async (event) => {
            await emit({ type: 'message', data: event.message });
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
        handle?.close();
        return handle?.id;
    }

    private showPrompt<T>(component: ScreenComponentType<T>, target: string, props: Omit<T, 'resolve'>): Promise<PromptResult> {
        return new Promise<PromptResult>((resolve) => {
            pushScreen(component, target, {
                ...props,
                resolve: (result: PromptResult) => resolve(result),
            } as T);
        });
    }
}

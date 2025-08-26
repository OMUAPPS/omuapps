import { currentPage } from '$lib/main/settings.js';
import PermissionRequestScreen from '$lib/screen/PermissionRequestScreen.svelte';
import PluginRequestScreen from '$lib/screen/PluginRequestScreen.svelte';
import { appWindow, invoke, tauriFs, tauriPath } from '$lib/tauri.js';
import { App, Omu } from '@omujs/omu';
import type { Cookie, GetCookiesRequest, HostRequest, UserResponse, WebviewEvent, WebviewPacket, WebviewRequest } from '@omujs/omu/extension/dashboard/dashboard-extension.js';
import type { DashboardHandler } from '@omujs/omu/extension/dashboard/dashboard.js';
import {
    DragDropReadResponse,
    type AppInstallRequest,
    type AppUpdateRequest,
    type DragDropReadRequestDashboard,
    type DragDropRequestDashboard,
    type FileData,
    type PermissionRequestPacket,
    type PluginRequestPacket
} from '@omujs/omu/extension/dashboard/packets.js';
import type { InvokedParams } from '@omujs/omu/extension/endpoint/packets.js';
import type { Table } from '@omujs/omu/extension/table/table.js';
import { Identifier, IdentifierMap } from '@omujs/omu/identifier.js';
import type { Locale } from '@omujs/omu/localization/locale.js';
import { Webview } from '@tauri-apps/api/webview';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Window } from '@tauri-apps/api/window';
import { dragDropApps, dragDrops } from './dragdrop.js';
import AppInstallRequestScreen from './screen/AppInstallRequestScreen.svelte';
import AppUpdateRequestScreen from './screen/AppUpdateRequestScreen.svelte';
import HostRequestScreen from './screen/HostRequestScreen.svelte';
import { screenContext } from './screen/screen.js';


export const IDENTIFIER = Identifier.fromKey('com.omuapps:dashboard');

export class Dashboard implements DashboardHandler {
    public currentApp: App | null = null;
    readonly apps: Table<App>;
    readonly webviewHandles: IdentifierMap<{
        id: Identifier,
        close: () => void,
    }> = new IdentifierMap();

    constructor(omu: Omu) {
        this.apps = omu.dashboard.apps;
        omu.dashboard.set(this);
        omu.onReady(() => {
            omu.i18n.setLocale(window.navigator.languages as Locale[]);
        });
        this.apps.event.add.listen(() => {
            appWindow.setFocus();
        });
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
            }
        }
        return new DragDropReadResponse(
            {
                ...request,
                files: dragDrop.files,
            },
            files,
        )
    }
    
    async getCookies(request: GetCookiesRequest): Promise<UserResponse<Cookie[]>> {
        const cookies = await invoke('get_cookies', {options: {
            label: appWindow.label,
            url: request.url,
        }});
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
            return {type: 'cancelled'};
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
        const label = `webview-${Math.floor(performance.timeOrigin*1000)}-${this.webviewHandles.size}-${Math.floor(performance.now()*10000)}`;
        const existingWebviewWindow = await WebviewWindow.getByLabel(label);
        existingWebviewWindow?.destroy();
        const existingWebview = await Webview.getByLabel(label);
        existingWebview?.close();
        const existingWindow = await Window.getByLabel(label);
        existingWindow?.close();
        await invoke('create_webview_window', {options: {
            script,
            url,
            label,
        }});
        const webviewWindow = await WebviewWindow.getByLabel(label);
        if (!webviewWindow) {
            throw new Error('Webview not found');
        }
        webviewWindow.once('tauri://close-requested', async () => {
            this.webviewHandles.delete(id);
            await emit({ type: 'closed' });
        });
        const id = params.caller.join(label);
        this.webviewHandles.set(id, {
            id,
            close: () => {
                webviewWindow.destroy();
            },
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

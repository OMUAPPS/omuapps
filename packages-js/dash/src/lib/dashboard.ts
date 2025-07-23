import { currentPage } from '$lib/main/settings.js';
import PermissionRequestScreen from '$lib/screen/PermissionRequestScreen.svelte';
import PluginRequestScreen from '$lib/screen/PluginRequestScreen.svelte';
import { appWindow, tauriFs, tauriPath } from '$lib/tauri.js';
import { App, Omu } from '@omujs/omu';
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
import type { Table } from '@omujs/omu/extension/table/table.js';
import { Identifier } from '@omujs/omu/identifier.js';
import type { Locale } from '@omujs/omu/localization/locale.js';
import { dragDropApps, dragDrops } from './dragdrop.js';
import AppInstallRequestScreen from './screen/AppInstallRequestScreen.svelte';
import AppUpdateRequestScreen from './screen/AppUpdateRequestScreen.svelte';
import { screenContext } from './screen/screen.js';

export const IDENTIFIER = Identifier.fromKey('com.omuapps:dashboard');

export class Dashboard implements DashboardHandler {
    public currentApp: App | null = null;
    readonly apps: Table<App>;

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
}

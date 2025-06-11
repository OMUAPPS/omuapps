import type { AppJson } from '@omujs/omu/app.js';
import type { DragDropFile } from '@omujs/omu/extension/dashboard/packets.js';
import { TauriEvent } from '@tauri-apps/api/event';
import type { FileInfo } from '@tauri-apps/plugin-fs';
import { dashboard, omu } from './client.js';
import { listen, tauriFs, tauriPath, waitForTauri } from './tauri.js';

type DragDrop = {
    files: DragDropFile[];
    paths: string[];
};

export const dragDropApps: string[] = [];
export const dragDrops: Record<string, DragDrop> = {};
let dragId = 0;

function getDragId(): string {
    return dragId.toString(36);
}

function nextDragId(): string {
    dragId ++;
    return getDragId();
}

function getFileType(info: FileInfo): 'file' | 'directory' | null {
    if (info.isFile) return 'file';
    if (info.isDirectory) return 'directory';
    return null;
}

async function getFilesByPaths(paths: string[]): Promise<DragDropFile[]> {
    const files: DragDropFile[] = [];
    for (const path of paths) {
        const stat = await tauriFs.stat(path);
        const type = getFileType(stat);
        if (!type) continue;
        files.push({
            name: await tauriPath.basename(path),
            size: stat.size,
            type,
        });
    }
    return files;
}

function getDragDropTarget(): AppJson | null {
    const { currentApp } = dashboard;
    if (!currentApp) return null;
    if (!dragDropApps.includes(currentApp.id.key())) return null;
    return currentApp.toJson();
}

waitForTauri().then(() => {
    listen(TauriEvent.DRAG_ENTER, async ({ payload: { position, paths } }) => {
        const drag_id = nextDragId();
        const app = getDragDropTarget();
        if (!app) return;
        const files = await getFilesByPaths(paths);
        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'enter',
                drag_id,
                position,
                files,
            }
        });
        dragDrops[drag_id] = { files, paths };
    });
    listen(TauriEvent.DRAG_OVER, async ({ payload: { position } }) => {
        const drag_id = getDragId();
        const app = getDragDropTarget();
        if (!app) return;
        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'over',
                drag_id,
                position,
            }
        })
    });
    listen(TauriEvent.DRAG_DROP, async ({ payload: { position, paths } }) => {
        const drag_id = getDragId();
        const app = getDragDropTarget();
        if (!app) return;
        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'drop',
                drag_id,
                position,
                files: await getFilesByPaths(paths),
            }
        })
    });
    listen(TauriEvent.DRAG_LEAVE, async () => {
        const drag_id = getDragId();
        const app = getDragDropTarget();
        if (!app) return;
        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'leave',
                drag_id,
            }
        })
    });
})

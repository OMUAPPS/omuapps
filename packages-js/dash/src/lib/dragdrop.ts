import { App } from '@omujs/omu';
import type { DragDropFile } from '@omujs/omu/api/dashboard';
import { listen, TauriEvent } from '@tauri-apps/api/event';
import { basename } from '@tauri-apps/api/path';
import { stat, type FileInfo } from '@tauri-apps/plugin-fs';
import { dashboard, omu } from './client.js';

type DragDrop = {
    files: DragDropFile[];
    paths: string[];
};

export const dragDropApps: string[] = [];
export const dragDrops: Record<string, DragDrop> = {};

/**
 * Manages the current drag session ID, ensuring consistency across drag events.
 */
class DragSessionManager {
    private currentId = 0;
    private sessionDragId = '';

    /**
     * Starts a new drag session and returns its ID.
     */
    startSession(): string {
        this.currentId++;
        this.sessionDragId = this.currentId.toString(36);
        return this.sessionDragId;
    }

    /**
     * Gets the current drag session ID.
     */
    getCurrentSessionId(): string {
        return this.sessionDragId;
    }

    /**
     * Ends the current drag session.
     */
    endSession(): void {
        this.sessionDragId = '';
    }
}

const dragSessionManager = new DragSessionManager();

/**
 * Converts file info to DragDropFile format, skipping unsupported types.
 */
function getFileType(info: FileInfo): 'file' | 'directory' | null {
    if (info.isFile) return 'file';
    if (info.isDirectory) return 'directory';
    return null;
}

/**
 * Converts file paths to DragDropFile objects in parallel.
 * Filters out files with unsupported types.
 */
async function getFilesByPaths(paths: string[]): Promise<DragDropFile[]> {
    const filePromises = paths.map(async (path) => {
        const info = await stat(path);
        const type = getFileType(info);
        if (!type) return null;
        return {
            name: await basename(path),
            size: info.size,
            type,
        };
    });

    const results = await Promise.all(filePromises);
    return results.filter((file): file is DragDropFile => file !== null);
}

/**
 * Gets the current app that can receive drag-drop events.
 */
function getDragDropTarget(): App | null {
    const { currentApp } = dashboard;
    if (!currentApp) return null;
    if (!dragDropApps.includes(currentApp.id.key())) return null;
    return currentApp;
}

/**
 * Initializes drag-drop event handlers for the application.
 * Manages drag sessions across multiple Tauri events (enter, over, drop, leave).
 */
export function initDragDrop() {
    listen(TauriEvent.DRAG_ENTER, async ({ payload: { position, paths } }) => {
        const drag_id = dragSessionManager.startSession();
        const app = getDragDropTarget();
        if (!app) return;

        const files = await getFilesByPaths(paths);
        dragDrops[drag_id] = { files, paths };

        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'enter',
                drag_id,
                position,
                files,
            },
        });
    });

    listen(TauriEvent.DRAG_OVER, async ({ payload: { position } }) => {
        const drag_id = dragSessionManager.getCurrentSessionId();
        if (!drag_id) return;

        const app = getDragDropTarget();
        if (!app) return;

        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'over',
                drag_id,
                position,
            },
        });
    });

    listen(TauriEvent.DRAG_DROP, async ({ payload: { position, paths } }) => {
        const drag_id = dragSessionManager.getCurrentSessionId();
        if (!drag_id) return;

        const app = getDragDropTarget();
        if (!app) return;

        const files = await getFilesByPaths(paths);
        dragDrops[drag_id] = { files, paths };

        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'drop',
                drag_id,
                position,
                files,
            },
        });
    });

    listen(TauriEvent.DRAG_LEAVE, async () => {
        const drag_id = dragSessionManager.getCurrentSessionId();
        if (!drag_id) return;

        const app = getDragDropTarget();
        if (!app) {
            dragSessionManager.endSession();
            return;
        }

        await omu.dashboard.notifyDropDragState({
            drag_id,
            app,
            state: {
                type: 'leave',
                drag_id,
            },
        });

        dragSessionManager.endSession();
    });
}

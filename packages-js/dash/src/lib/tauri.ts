import type * as api from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { BROWSER } from 'esm-env';
import { omu } from './client.js';

let _invoke: typeof api.invoke;

export type Config = {
    enable_beta: boolean;
};
type Commands = {
    close_window: () => void;
    start_server: () => string;
    stop_server: () => string;
    get_token: () => string | null;
    get_config: () => Config;
    set_config: (args: { config: Config }) => void;
    generate_log_file: () => string;
    clean_environment: () => void;
    open_python_path: () => void;
    open_uv_path: () => void;
};

export async function invoke<T extends keyof Commands>(
    command: T,
    ...args: Parameters<Commands[T]>
): Promise<ReturnType<Commands[T]>> {
    assertTauri();
    return _invoke(command, ...args);
}
export type Progress = (
    { type: 'PythonDownloading', msg: string, progress: number, total: number }
    | { type: 'PythonUnkownVersion', msg: string, progress: undefined, total: undefined }
    | { type: 'PythonChecksumFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'PythonExtracting', msg: string, progress: number, total: number }
    | { type: 'PythonExtractFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'UvDownloading', msg: string, progress: number, total: number }
    | { type: 'UvExtracting', msg: string, progress: number, total: number }
    | { type: 'UvCleanupOldVersions', msg: string, progress: number, total: number }
    | { type: 'UvCleanupOldVersionsFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'UvUpdatePip', msg: string, progress: undefined, total: undefined }
    | { type: 'UvUpdatePipFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'UvUpdateRequirements', msg: string, progress: undefined, total: undefined }
    | { type: 'UvUpdateRequirementsFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerTokenReadFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerTokenWriteFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerCreateDataDirFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerStopping', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerStopFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerStarting', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerStartFailed', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerStarted', msg: string, progress: undefined, total: undefined }
    | { type: 'ServerAlreadyStarted', msg: string, progress: undefined, total: undefined }
    | { type: 'PythonRemoving', msg: string, progress: number, total: number }
    | { type: 'UvRemoving', msg: string, progress: number, total: number }
)
type Events = {
    server_state: Progress;
    server_restart: unknown;
    'single-instance': {
        args: string[],
        cwd: string,
    }
    [TauriEvent.WINDOW_RESIZED]: unknown;
    [TauriEvent.WINDOW_RESIZED]: unknown;
    [TauriEvent.WINDOW_MOVED]: unknown;
    [TauriEvent.WINDOW_CLOSE_REQUESTED]: unknown;
    [TauriEvent.WINDOW_DESTROYED]: unknown;
    [TauriEvent.WINDOW_FOCUS]: unknown;
    [TauriEvent.WINDOW_BLUR]: unknown;
    [TauriEvent.WINDOW_SCALE_FACTOR_CHANGED]: unknown;
    [TauriEvent.WINDOW_THEME_CHANGED]: unknown;
    [TauriEvent.WINDOW_CREATED]: unknown;
    [TauriEvent.WEBVIEW_CREATED]: unknown;
    [TauriEvent.DRAG_ENTER]: unknown;
    [TauriEvent.DRAG_OVER]: unknown;
    [TauriEvent.DRAG_DROP]: unknown;
    [TauriEvent.DRAG_LEAVE]: unknown;
};

type AppEvent<T> = {
    payload: T;
};

import { listen as listenTauri, TauriEvent } from '@tauri-apps/api/event';

export function listen<T extends keyof Events>(
    command: T,
    callback: (event: AppEvent<Events[T]>) => void,
): Promise<() => void> {
    assertTauri();
    return listenTauri(command, (event: AppEvent<Events[T]>) => {
        callback(event);
    });
}

export function listenSync<T extends keyof Events>(
    command: T,
    callback: (event: AppEvent<Events[T]>) => void,
): () => void {
    assertTauri();
    let destroyCallback = () => { };
    let isDestroyed = false;
    listenTauri(command, (event: AppEvent<Events[T]>) => {
        callback(event);
    }).then((destroyFunc) => {
        destroyCallback = destroyFunc;
        if (isDestroyed) {
            destroyCallback();
        }
    });
    return () => {
        destroyCallback();
        isDestroyed = true;
    };
}

let loaded = false;
const loadHandlers: (() => void)[] = [];
const loadPromises: (() => Promise<void>)[] = [];

function loadLazy<T>(load: () => Promise<T>): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: T | any = {};
    loadPromises.push(async () => {
        obj = await load();
    });
    return new Proxy(obj, {
        get(target, prop) {
            if (!loaded) {
                throw new Error('Tauri not loaded yet');
            }
            if (prop in obj) {
                return obj[prop];
            } else {
                throw new Error(`Property ${prop.toString()} not found`);
            }
        },
    });
}

export function assertTauri() {
    if (!checkOnTauri()) {
        throw new Error('Not on Tauri');
    }
    if (!loaded) {
        throw new Error('Tauri not loaded yet');
    }
}

export const tauriWindow = loadLazy(() => import('@tauri-apps/api/window'));
export const appWindow = loadLazy(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return getCurrentWindow();
});

export function checkOnTauri() {
    if (typeof window === 'undefined') return false;
    if (typeof window.__TAURI_INTERNALS__ === 'undefined') return false;
    return true;
}
export const IS_TAURI = checkOnTauri();

async function load() {
    if (!checkOnTauri) {
        return;
    }
    if (loaded) {
        throw new Error('Tauri already loaded');
    }
    const [{ invoke }] = await Promise.all([
        import('@tauri-apps/api/core'),
        import('@tauri-apps/api/event'),
    ]);
    _invoke = invoke;
    await Promise.all(loadPromises.map((it) => it()));
    loadHandlers.forEach((handler) => handler());
    loaded = true;
}

if (BROWSER) {
    load();
}
export function waitForTauri() {
    if (!checkOnTauri()) {
        return Promise.resolve();
    }
    if (loaded) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        loadHandlers.push(resolve);
    });
}

export async function checkUpdate() {
    const beta = get(isBetaEnabled);
    console.log('beta', beta);
    return await check({
        headers: {
            'Updater-Channel': beta ? 'beta' : 'stable',
        },
    });
}

export type UpdateEvent = {
    typ: 'shutting-down',
} | {
    typ: 'updating',
    downloaded: number,
    contentLength: number,
} | {
    typ: 'restarting',
};

export async function applyUpdate(update: Update, progress: (event: UpdateEvent) => void) {
    // state = 'shutting-down';
    progress({ typ: 'shutting-down' });
    try {
        omu.server.shutdown();
        invoke('stop_server');
    } catch (e) {
        console.error(e);
    }
    // state = 'updating';
    progress({ typ: 'updating', downloaded: 0, contentLength: 0 });
    let downloaded = 0;
    let contentLength = 0;
    // alternatively we could also call update.download() and update.install() separately
    await update.downloadAndInstall((event) => {
        switch (event.event) {
        case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(
                `started downloading ${event.data.contentLength} bytes`,
            );
            break;
        case 'Progress':
            downloaded += event.data.chunkLength;
            console.log(
                `downloaded ${downloaded} from ${contentLength}`,
            );
            break;
        case 'Finished':
            console.log('download finished');
            break;
        }
    });

    console.log('update installed');
    await relaunch();
    // state = 'restarting';
    progress({ typ: 'restarting' });
}

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { exit } from '@tauri-apps/plugin-process';
import { get } from 'svelte/store';
import { isBetaEnabled } from './main/settings.js';

waitForTauri().then(async () => {
    let visible = false;
    visible = await appWindow.isVisible();

    const menu = await Menu.new({
        items: [
            {
                id: 'toggle',
                text: visible ? 'Hide' : 'Show',
                action: async () => {
                    const item = await menu.get('toggle');
                    if (visible) {
                        await appWindow.hide();
                    } else {
                        await appWindow.show();
                    }
                    visible = await appWindow.isVisible();
                    item.setText(visible ? 'Hide' : 'Show');
                }
            },
            {
                id: 'quit',
                text: 'Quit',
                action: async () => {
                    await exit(0);
                }
            }
        ]
    });

    listen(TauriEvent.WINDOW_BLUR, async () => {
        if (await appWindow.isVisible()) return;
        visible = false;
        const item = await menu.get('toggle');
        if (item) {
            item.setText('Show');
        }
    });
    const tray = await TrayIcon.getById('omuapps');
    if (tray) {
        tray.setMenu(menu);
        return;
    }
    await TrayIcon.new({
        id: 'omuapps',
        icon: await defaultWindowIcon(),
        menu,
        showMenuOnLeftClick: true,
    });
});

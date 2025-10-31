import type * as api from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { BROWSER } from 'esm-env';
import { omu } from './client.js';

let _invoke: typeof api.invoke;
let loaded = false;

export type Config = {
    enable_beta: boolean;
};

export type Cookie = {
    name: string;
    value: string;
};

type SerdeEnum<T extends Record<string, unknown>> = {
    [K in keyof T]: T[K] & { type: K };
}[keyof T];

export type Progress = {
    msg: string;
    progress: number;
    total: number;
};

export type UvEnsureProgress = SerdeEnum<{
    Downloading: Progress;
    Extracting: Progress;
    UvCleanupOldVersions: Progress;
    UvUpdatePip: {
        msg: string;
    };
    UpdateRequirements: {
        msg: string;
    };
}>;

export type UvEnsureError = SerdeEnum<{
    CleanupOldVersionsFailed: { msg: string };
    UpdatePipFailed: { msg: string };
    UpdateRequirementsFailed: { msg: string };
    NoDownloadFound: { msg: string };
}>;

export type ServerEnsureProgress = SerdeEnum<{
    UpdatingDependencies: { progress: UvEnsureProgress };
    ServerStopping: { msg: string };
}>;

export type ServerEnsureError = {
    VersionReadFailed: { msg: string };
    UpdateDependenciesFailed: { reason: UvEnsureError };
    StopFailed: { msg: string };
    TokenReadFailed: { msg: string };
    TokenWriteFailed: { msg: string };
    CreateDataDirFailed: { msg: string };
    StartFailed: { msg: string };
    AlreadyRunning: { msg: string };
};

export type PythonEnsureError = SerdeEnum<{
    ChecksumFailed: { msg: string };
    ExtractFailed: { msg: string };
    UnkownVersion: { msg: string };
}>;
export type PythonEnsureProgress = SerdeEnum<{
    Downloading: Progress;
    Extracting: Progress;
}>;

export type StartError = SerdeEnum<{
    ServerStartFailed: { msg: string };
    PythonEnsureError: { reason: PythonEnsureError };
    UvEnsureError: { reason: UvEnsureError };
    ServerEnsureError: { reason: ServerEnsureError };
}>;

export type StartProgress = SerdeEnum<{
    Python: { progress: PythonEnsureProgress };
    Uv: { progress: UvEnsureProgress };
    Server: { progress: ServerEnsureProgress };
}>;

export type StartResult = SerdeEnum<{
    AlreadyRunning: { token: string };
    Starting: { token: string };
}>;

export type StopError = SerdeEnum< {
    PythonEnsureError: { reason: PythonEnsureError };
    ServerEnsureError: { reason: ServerEnsureError };
}>;

export type StopProgress = SerdeEnum< {
    Python: { progress: PythonEnsureProgress };
    ServerStopping: { msg: string };
}>;

export type CleanError = SerdeEnum<{
    PythonError: { reason: PythonEnsureError };
    ServerError: { reason: string };
    RemovePythonError: { reason: string };
    RemoveUvError: { reason: string };
}>;

export type CleanProgress = SerdeEnum<{
    Python: { progress: PythonEnsureProgress };
    PythonRemoving: { progress: Progress };
    UvRemoving: { progress: Progress };
}>;

export type UninstallProgress = SerdeEnum<{
    Python: { progress: PythonEnsureProgress };
    PluginRemoving: unknown;
    AppDataRemoving: { progress: Progress };
    PythonRemoving: { progress: Progress };
    UvRemoving: { progress: Progress };
}>;

export type UninstallError = SerdeEnum<{
    PythonError: { reason: PythonEnsureError };
    ServerError: { reason: string };
    RemoveAppDataError: { reason: string };
    RemovePythonError: { reason: string };
    RemoveUvError: { reason: string };
}>;

export type ServerState = SerdeEnum<{
    ServerStarting: { msg: string };
    ServerRestarting: { msg: string };
    ServerStopped: { msg: string };
}>;

type Events = {
    start_progress: StartProgress;
    stop_progress: StopProgress;
    clean_progress: CleanProgress;
    uninstall_progress: UninstallProgress;
    server_state: ServerState;
    server_restart: unknown;
    'single-instance': {
        args: string[];
        cwd: string;
    };
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
    [TauriEvent.DRAG_ENTER]: { position: { x: number; y: number }; paths: string[] };
    [TauriEvent.DRAG_OVER]: { position: { x: number; y: number } };
    [TauriEvent.DRAG_DROP]: { position: { x: number; y: number }; paths: string[] };
    [TauriEvent.DRAG_LEAVE]: null;
};

type Commands = {
    close_window(): void;
    start_server(): StartResult;
    stop_server(): undefined;
    clean_environment(): undefined;
    uninstall(): undefined;
    get_token(): string | null;
    get_config(): Config;
    set_config(options: { config: Config }): void;
    create_webview_window(options: {
        options: {
            label: string;
            url: string;
            script: string;
        };
    }): Cookie[];
    get_cookies(options: {
        options: {
            label: string;
            url: string;
        };
    }): Cookie[];
    generate_log_file(): string;
    clean_environment(): void;
    open_python_path(): void;
    open_uv_path(): void;
};

export async function invoke<T extends keyof Commands>(
    command: T,
    ...args: Parameters<Commands[T]>
): Promise<ReturnType<Commands[T]>> {
    assertTauri();
    return _invoke(command, ...args);
}

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

export const tauriFs = loadLazy(() => import('@tauri-apps/plugin-fs'));
export const tauriWindow = loadLazy(() => import('@tauri-apps/api/window'));
export const tauriPath = loadLazy(() => import('@tauri-apps/api/path'));
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

export const startProgress = writable<StartProgress | undefined>();
export const stopProgress = writable<StopProgress | undefined>();
export const cleanProgress = writable<CleanProgress | undefined>();
export const uninstallProgress = writable<UninstallProgress | undefined>();
export const serverState = writable<ServerState | undefined>();

async function load() {
    if (!checkOnTauri()) {
        return;
    }
    if (loaded) {
        throw new Error('Tauri already loaded');
    }
    loaded = true;

    const [{ invoke }] = await Promise.all([
        import('@tauri-apps/api/core'),
        import('@tauri-apps/api/event'),
    ]);
    _invoke = invoke;
    await Promise.all(loadPromises.map((it) => it()));
    loadHandlers.forEach((handler) => handler());
    initDragDrop();
    await initTrayIcon();
    await listen('start_progress', ({ payload }) => {
        startProgress.set(payload);
    });
    await listen('stop_progress', ({ payload }) => {
        stopProgress.set(payload);
    });
    await listen('clean_progress', ({ payload }) => {
        cleanProgress.set(payload);
    });
    await listen('uninstall_progress', ({ payload }) => {
        uninstallProgress.set(payload);
    });
    await listen('server_state', ({ payload }) => {
        serverState.set(payload);
    });
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
    return await check({
        headers: {
            'Updater-Channel': beta ? 'beta' : 'stable',
        },
    });
}

export type UpdateEvent = {
    type: 'shutting-down';
} | {
    type: 'updating';
    downloaded: number;
    contentLength: number;
} | {
    type: 'restarting';
};

export async function applyUpdate(update: Update, progress: (event: UpdateEvent) => void) {
    // state = 'shutting-down';
    progress({ type: 'shutting-down' });
    try {
        omu.server.shutdown();
        invoke('stop_server');
    } catch (e) {
        console.error(e);
    }
    // state = 'updating';
    progress({ type: 'updating', downloaded: 0, contentLength: 0 });
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
                progress({ type: 'updating', downloaded, contentLength });
                break;
            case 'Progress':
                downloaded += event.data.chunkLength;
                console.log(
                    `downloaded ${downloaded} from ${contentLength}`,
                );
                progress({ type: 'updating', downloaded, contentLength });
                break;
            case 'Finished':
                console.log('download finished');
                progress({ type: 'updating', downloaded, contentLength });
                break;
        }
    });

    console.log('update installed');
    await relaunch();
    // state = 'restarting';
    progress({ type: 'restarting' });
}

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { exit } from '@tauri-apps/plugin-process';
import { get, writable } from 'svelte/store';
import { initDragDrop } from './dragdrop.js';
import { isBetaEnabled } from './main/settings.js';

async function initTrayIcon() {
    let visible = false;
    visible = await appWindow.isVisible();

    const menu = await Menu.new({
        items: [
            {
                id: 'toggle',
                text: visible ? 'Hide' : 'Show',
                action: async () => {
                    const item = await menu.get('toggle');
                    if (!item) throw new Error('Menu item not found');
                    if (visible) {
                        await appWindow.hide();
                    } else {
                        await appWindow.show();
                    }
                    visible = await appWindow.isVisible();
                    item.setText(visible ? 'Hide' : 'Show');
                },
            },
            {
                id: 'quit',
                text: 'Quit',
                action: async () => {
                    await exit();
                },
            },
        ],
    });

    listen(TauriEvent.WINDOW_BLUR, async () => {
        if (await appWindow.isVisible()) return;
        visible = false;
        const item = await menu.get('toggle');
        if (item) {
            item.setText('Show');
        }
    });
    listen(TauriEvent.WINDOW_FOCUS, async () => {
        visible = true;
        const item = await menu.get('toggle');
        if (item) {
            item.setText('Hide');
        }
    });
    const tray = await TrayIcon.getById('omuapps');
    if (tray) {
        tray.setMenu(menu);
        return;
    }
    const icon = await defaultWindowIcon();
    await TrayIcon.new({
        id: 'omuapps',
        icon: icon || undefined,
        menu,
        showMenuOnLeftClick: true,
    });
}

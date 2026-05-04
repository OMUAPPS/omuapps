import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { BROWSER } from 'esm-env';
import { dashboard, omu } from './client.js';

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

export interface WebviewMessage {
    label: string;
    message: string;
}

type Events = {
    start_progress: StartProgress;
    stop_progress: StopProgress;
    clean_progress: CleanProgress;
    uninstall_progress: UninstallProgress;
    server_state: ServerState;
    server_restart: unknown;
    webview_message: WebviewMessage;
    'single-instance': {
        args: string[];
        cwd: string;
    };
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
            script?: string;
        };
    }): Cookie[];
    get_cookies(options: {
        options: {
            label: string;
            url: string;
        };
    }): Cookie[];
    generate_log_file(): string;
    open_python_path(): void;
    open_uv_path(): void;
};

declare module '@tauri-apps/api/core' {
    function invoke<T extends keyof Commands>(
        command: T,
        ...args: Parameters<Commands[T]>
    ): Promise<ReturnType<Commands[T]>>;
}

type AppEvent<T> = {
    payload: T;
};

import { listen, TauriEvent } from '@tauri-apps/api/event';

declare module '@tauri-apps/api/event' {
    function listen<T extends keyof Events>(
        command: T,
        callback: (event: AppEvent<Events[T]>) => void,
    ): Promise<() => void>;
}

export function assertTauri() {
    if (!checkOnTauri()) {
        throw new Error('Not on Tauri');
    }
}

export const appWindow = getCurrentWindow();

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
export const backgroundRequested = writable(false);

/**
 * Registers event listeners for Tauri events.
 * Consolidates progress and state updates into store subscriptions.
 */
async function registerEventListeners() {
    const listeners: Array<{
        event: keyof Events;
        handler: (payload: unknown) => void;
    }> = [
        {
            event: 'start_progress',
            handler: (payload) => startProgress.set(payload as StartProgress),
        },
        {
            event: 'stop_progress',
            handler: (payload) => stopProgress.set(payload as StopProgress),
        },
        {
            event: 'clean_progress',
            handler: (payload) => cleanProgress.set(payload as CleanProgress),
        },
        {
            event: 'uninstall_progress',
            handler: (payload) => uninstallProgress.set(payload as UninstallProgress),
        },
        {
            event: 'server_state',
            handler: (payload) => serverState.set(payload as ServerState),
        },
        {
            event: 'webview_message',
            handler: (payload) => dashboard.processWebviewMessage(payload as WebviewMessage),
        },
    ];

    for (const { event, handler } of listeners) {
        await listen(event, ({ payload }) => handler(payload));
    }
}

/**
 * Initializes Tauri backend: CLI arguments, event listeners, and UI components.
 */
async function load() {
    if (!checkOnTauri()) {
        return;
    }

    console.log('Initializing Tauri...');
    const matches = await getMatches();
    console.log('arguments', JSON.stringify(matches, null, 2));
    if (matches.args.background?.value) {
        backgroundRequested.set(true);
    }

    initDragDrop();
    await initTrayIcon();
    await registerEventListeners();
}

if (BROWSER) {
    load();
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

/**
 * Handles update download and installation with progress notifications.
 * Shuts down server, downloads/installs update, and relaunches application.
 */
export async function applyUpdate(update: Update, progress: (event: UpdateEvent) => void) {
    // Shutdown and prepare for update
    progress({ type: 'shutting-down' });
    try {
        omu.server.shutdown();
        invoke('stop_server');
    } catch (e) {
        console.error(e);
    }

    // Initialize download state with helper for progress notifications
    let downloadedBytes = 0;
    let contentLengthBytes = 0;
    const notifyProgress = () =>
        progress({ type: 'updating', downloaded: downloadedBytes, contentLength: contentLengthBytes });

    notifyProgress();

    // Download and install update
    await update.downloadAndInstall((event) => {
        switch (event.event) {
            case 'Started':
                contentLengthBytes = event.data.contentLength || 0;
                console.log(`started downloading ${contentLengthBytes} bytes`);
                notifyProgress();
                break;
            case 'Progress':
                downloadedBytes += event.data.chunkLength;
                console.log(`downloaded ${downloadedBytes} from ${contentLengthBytes}`);
                notifyProgress();
                break;
            case 'Finished':
                console.log('download finished');
                notifyProgress();
                break;
        }
    });

    // Relaunch application
    console.log('update installed');
    progress({ type: 'restarting' });
    await relaunch();
}

import { defaultWindowIcon } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getMatches } from '@tauri-apps/plugin-cli';
import { exit } from '@tauri-apps/plugin-process';
import { get, writable } from 'svelte/store';
import { initDragDrop } from './dragdrop.js';
import { isBetaEnabled } from './settings.js';

/**
 * Initializes the tray icon with menu and window visibility handlers.
 */
async function initTrayIcon() {
    let visible = await appWindow.isVisible();

    const menu = await Menu.new({
        items: [
            {
                id: 'toggle',
                text: visible ? 'Hide' : 'Show',
                action: async () => {
                    if (visible) {
                        await appWindow.hide();
                    } else {
                        await appWindow.show();
                    }
                    visible = await appWindow.isVisible();
                    await updateToggleMenuText(menu, visible);
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

    // Register window focus/blur handlers to keep menu in sync
    listen(TauriEvent.WINDOW_BLUR, async () => {
        if (await appWindow.isVisible()) return;
        visible = false;
        await updateToggleMenuText(menu, visible);
    });

    listen(TauriEvent.WINDOW_FOCUS, async () => {
        visible = true;
        await updateToggleMenuText(menu, visible);
    });

    // Register or update existing tray icon
    const existingTray = await TrayIcon.getById('omuapps');
    if (existingTray) {
        existingTray.setMenu(menu);
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

/**
 * Updates the toggle menu item text based on window visibility state.
 */
async function updateToggleMenuText(menu: Menu, isVisible: boolean): Promise<void> {
    const item = await menu.get('toggle');
    if (item) {
        item.setText(isVisible ? 'Hide' : 'Show');
    }
}

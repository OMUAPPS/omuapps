import type * as event from '@tauri-apps/api/event';
import type * as api from '@tauri-apps/api/tauri';
import { BROWSER } from 'esm-env';

let _invoke: typeof api.invoke;
let _listen: typeof event.listen;
type Commands = {
    start_server: () => string;
    get_token: () => string | null;
    generate_log_file: () => string;
    clean_environment: () => void;
};

export async function invoke<T extends keyof Commands>(
    command: T,
    ...args: Parameters<Commands[T]>
): Promise<ReturnType<Commands[T]>> {
    assertTauri();
    return _invoke(command, ...args);
}
export type PROGRESS_EVENT = {
    PythonDownloading: string;
    PythonUnkownVersion: string;
    PythonChecksumFailed: string;
    PythonExtracting: string;
    UvDownloading: string;
    UvExtracting: string;
    UvCleanupOldVersions: string;
    UvCleanupOldVersionsFailed: string;
    UvUpdatePip: string;
    UvUpdatePipFailed: string;
    UvUpdateRequirements: string;
    UvUpdateRequirementsFailed: string;
    ServerTokenReadFailed: string;
    ServerTokenWriteFailed: string;
    ServerCreateDataDirFailed: string;
    ServerStoppping: string;
    ServerStopFailed: string;
    ServerStarting: string;
    ServerStartFailed: string;
    ServerStarted: string;
    ServerAlreadyStarted: string;
};
export type ProgressMap<T extends keyof PROGRESS_EVENT> = {
    [K in T]: PROGRESS_EVENT[K];
};
export type Progress = ProgressMap<keyof PROGRESS_EVENT>;
type Events = {
    server_state: Progress;
    [event.TauriEvent.WINDOW_RESIZED]: unknown;
    [event.TauriEvent.WINDOW_MOVED]: unknown;
    [event.TauriEvent.WINDOW_CLOSE_REQUESTED]: unknown;
    [event.TauriEvent.WINDOW_CREATED]: unknown;
    [event.TauriEvent.WINDOW_DESTROYED]: unknown;
    [event.TauriEvent.WINDOW_FOCUS]: unknown;
    [event.TauriEvent.WINDOW_BLUR]: unknown;
    [event.TauriEvent.WINDOW_SCALE_FACTOR_CHANGED]: unknown;
    [event.TauriEvent.WINDOW_THEME_CHANGED]: unknown;
    [event.TauriEvent.WINDOW_FILE_DROP]: string[];
    [event.TauriEvent.WINDOW_FILE_DROP_HOVER]: unknown;
    [event.TauriEvent.WINDOW_FILE_DROP_CANCELLED]: unknown;
    [event.TauriEvent.MENU]: unknown;
    [event.TauriEvent.CHECK_UPDATE]: unknown;
    [event.TauriEvent.UPDATE_AVAILABLE]: unknown;
    [event.TauriEvent.INSTALL_UPDATE]: unknown;
    [event.TauriEvent.STATUS_UPDATE]: unknown;
    [event.TauriEvent.DOWNLOAD_PROGRESS]: unknown;
};

type TauriEvent<T> = {
    payload: T;
    windowLabel: string;
};

export function listen<T extends keyof Events>(
    command: T,
    callback: (event: TauriEvent<Events[T]>) => void,
): Promise<() => void> {
    assertTauri();
    return _listen(command, (event: TauriEvent<Events[T]>) => {
        callback(event);
    });
}

export function listenSync<T extends keyof Events>(
    command: T,
    callback: (event: TauriEvent<Events[T]>) => void,
): () => void {
    assertTauri();
    let destroyCallback = () => {};
    let isDestroyed = false;
    _listen(command, (event: TauriEvent<Events[T]>) => {
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

async function load() {
    if (!checkOnTauri) {
        return;
    }
    if (loaded) {
        throw new Error('Tauri already loaded');
    }
    const [{ invoke }, { listen }] = await Promise.all([
        import('@tauri-apps/api/tauri'),
        import('@tauri-apps/api/event'),
    ]);
    _invoke = invoke;
    _listen = listen;
    await Promise.all(loadPromises.map((it) => it()));
    loadHandlers.forEach((handler) => handler());
    loaded = true;
}

export function checkOnTauri() {
    if (typeof window === 'undefined') return false;
    if (typeof window.__TAURI_IPC__ === 'undefined') return false;
    return true;
}
export const IS_TAURI = checkOnTauri();

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

if (BROWSER) {
    load();
}

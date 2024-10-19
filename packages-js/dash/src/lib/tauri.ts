import type * as event from '@tauri-apps/api/event';
import type * as api from '@tauri-apps/api/tauri';
import { BROWSER } from 'esm-env';

let _invoke: typeof api.invoke;
let _listen: typeof event.listen;
type Commands = {
    start_server: () => string;
    restart_server: () => string;
    get_token: () => string | null;
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
    {type: 'PythonDownloading', msg: string, progress: number, total: number }
    | {type: 'PythonUnkownVersion', msg: string, progress: undefined, total: undefined}
    | {type: 'PythonChecksumFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'PythonExtracting', msg: string, progress: number, total: number }
    | {type: 'UvDownloading', msg: string, progress: number, total: number }
    | {type: 'UvExtracting', msg: string, progress: number, total: number }
    | {type: 'UvCleanupOldVersions', msg: string, progress: number, total: number }
    | {type: 'UvCleanupOldVersionsFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'UvUpdatePip', msg: string, progress: undefined, total: undefined}
    | {type: 'UvUpdatePipFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'UvUpdateRequirements', msg: string, progress: undefined, total: undefined}
    | {type: 'UvUpdateRequirementsFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerTokenReadFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerTokenWriteFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerCreateDataDirFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerStopping', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerStopFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerStarting', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerStartFailed', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerStarted', msg: string, progress: undefined, total: undefined}
    | {type: 'ServerAlreadyStarted', msg: string, progress: undefined, total: undefined}
    | {type: 'PythonRemoving', msg: string, progress: number, total: number }
    | {type: 'UvRemoving', msg: string, progress: number, total: number }
)
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

<script context="module" lang="ts">
    export type LoadingState = {
        type: 'loading',
        message: string,
    } | {
        type: 'restart',
    } | {
        type: 'cleaning',
    } | {
        type: 'failed',
        message: string,
        details?: string,
    } | {
        type: 'progress',
        message: string,
        details?: string,
        progress?: number,
        total?: number,
    } | {
        type: 'disconnected',
        packet: DisconnectPacket,
    } | {
        type: 'ready',
    };
    export const DEFAULT_STATE: Record<LoadingState['type'], LoadingState> = {
        loading: { type: 'loading', message: 'Loading...' },
        restart: { type: 'restart' },
        cleaning: { type: 'cleaning' },
        failed: { type: 'failed', message: 'Failed', details: 'Details' },
        progress: { type: 'progress', message: 'Progress', details: 'Details', progress: 0, total: 100 },
        disconnected: { type: 'disconnected', packet: new DisconnectPacket({ type: DisconnectType.ANOTHER_CONNECTION, message: 'Disconnected' }) },
        ready: { type: 'ready' },
    };
</script>
<script lang="ts">
    import { omu } from '$lib/client.js';
    import { i18n } from '$lib/i18n/i18n-context.js';
    import { DEFAULT_LOCALE, LOCALES } from '$lib/i18n/i18n.js';
    import title from '$lib/images/title.svg';
    import { language } from '$lib/main/settings.js';
    import {
        applyUpdate,
        checkUpdate,
        invoke,
        listen,
        waitForTauri,
        type Progress,
        type UpdateEvent
    } from '$lib/tauri.js';
    import { createI18nUnion, type I18n } from '@omujs/i18n';
    import { DisconnectPacket, DisconnectType } from '@omujs/omu/network/packet/packet-types.js';
    import '@omujs/ui';
    import { Theme } from '@omujs/ui';
    import '@tabler/icons-webfont/dist/tabler-icons.scss';
    import { exit } from '@tauri-apps/plugin-process';
    import type { Update } from '@tauri-apps/plugin-updater';
    import { onMount } from 'svelte';
    import LoadingStatus from './_components/LoadingStatus.svelte';
    import './styles.scss';

    const PROGRESS_NAME: Record<Progress['type'], string> = {
        PythonDownloading: '(1/6)動作環境1をダウンロード中',
        PythonUnkownVersion: '内部Pythonのバージョンが不明です',
        PythonChecksumFailed: '内部Pythonの認証に失敗しました',
        PythonExtracting: '(2/6)動作環境1をインストール中',
        PythonExtractFailed: '動作環境の展開に失敗しました',
        UvDownloading: '(3/6)動作環境2をダウンロード中',
        UvExtracting: '(4/6)動作環境2をインストール中',
        UvCleanupOldVersions: '古い動作環境を削除中',
        UvCleanupOldVersionsFailed: '古い動作環境の削除に失敗しました',
        UvUpdatePip: '(5/6)動作環境3を更新中',
        UvUpdatePipFailed: '動作環境3の更新に失敗しました',
        UvUpdateRequirements: '(6/6)動作環境4を更新中',
        UvUpdateRequirementsFailed: '動作環境4の更新に失敗しました',
        ServerTokenReadFailed: 'APIの認証情報の読み込みに失敗しました',
        ServerTokenWriteFailed: 'APIの認証情報の書き込みに失敗しました',
        ServerCreateDataDirFailed: 'データフォルダの作成に失敗しました',
        ServerStopping: 'サーバーを停止中...',
        ServerStopFailed: 'サーバーの停止に失敗しました',
        ServerStarting: 'サーバーを起動中...',
        ServerStartFailed: 'サーバーの起動に失敗しました',
        ServerStarted: 'サーバーが起動しました',
        ServerAlreadyStarted: 'サーバーは既に起動しています',
        PythonRemoving: 'Python環境を削除中...',
        UvRemoving: 'uv環境を削除中...',
    };
    const INSTALL_PROGRESS: Progress['type'][] = [
        'PythonDownloading',
        'PythonExtracting',
        'UvDownloading',
        'UvExtracting',
        'UvUpdatePip',
        'UvUpdateRequirements',
        'ServerStarting',
    ];
    const FAILED_PROGRESS: Progress['type'][] = [
        'PythonChecksumFailed',
        'PythonExtractFailed',
        'UvCleanupOldVersionsFailed',
        'UvUpdatePipFailed',
        'UvUpdateRequirementsFailed',
        'ServerTokenReadFailed',
        'ServerTokenWriteFailed',
        'ServerCreateDataDirFailed',
        'ServerStopFailed',
        'ServerStartFailed',
    ];

    let status: LoadingState = { type: 'loading', message: '読み込み中' };

    function setStatus(value: typeof status) {
        status = value;
        console.log('status', JSON.stringify(status));
    }

    let update: Update | null = null;
    let updateProgress: UpdateEvent | null = null;

    async function init() {
        const STAGES = {
            checkUpdate: 'Check Update',
            loadingLocale: 'Loading Locale',
            waitingForTauri: 'Waiting for Tauri',
            listeningToServerState: 'Listening to Server State',
            startingServer: 'Starting Server',
            startingClient: 'Starting Client',
        }
        let stage: keyof typeof STAGES = 'checkUpdate';
        try {
            try {
                update = await checkUpdate();
            } catch (e) {
                console.error('Failed to check update', e);
            }
            await loadLocale();
            stage = 'waitingForTauri';
            await waitForTauri();
            stage = 'listeningToServerState';
            const unlistenState = await listen('server_state', ({ payload }) => {
                const { type, progress, total } = payload;
                if (FAILED_PROGRESS.includes(type)) {
                    setStatus({ type: 'failed', message: PROGRESS_NAME[type], details: payload.msg });
                } else if (INSTALL_PROGRESS.includes(type)) {
                    setStatus({ type: 'progress', message: PROGRESS_NAME[type], details: payload.msg, progress: progress || 0, total: total || 0 });
                } else {
                    setStatus({ type: 'progress', message: PROGRESS_NAME[type], details: payload.msg });
                }
            });
            stage = 'startingServer';
            await invoke('start_server');
            console.log('server started');

            language.subscribe(loadLocale);
            let unlistenDisconnect = () => {};
            let unlistenNetwork = () => {};
            omu.onReady(() => {
                setStatus({ type: 'ready' });
                unlistenState();
                unlistenDisconnect();
                unlistenNetwork();
            });
            unlistenDisconnect = omu.network.event.disconnected.listen((packet) => {
                if (!packet) return;
                if (packet.type === DisconnectType.SERVER_RESTART) return;
                setStatus({ type: 'disconnected', packet });
            }); 
            unlistenNetwork = omu.network.event.status.listen((value) => {
                if (value.type !== 'disconnected') return;
                if (value.reason) {
                    setStatus({ type: 'failed', message: 'Connection failed', details: `${value.reason.type}:${value.reason.message}` });
                    return;
                }
                if (value.attempt === undefined) return;
                if (value.attempt <= 3) return;
                setStatus({ type: 'failed', message: `Connection failed after ${value.attempt} attempts` });
            });
            stage = 'startingClient';
            await omu.start()
        } catch (e) {
            const stageName = STAGES[stage];
            setStatus({
                type: 'failed',
                message: `${stageName} failed`,
                details: typeof e === 'string' ? e : JSON.stringify(e),
            });
            console.error(`Failed to ${stageName}`, e);
            throw e;
        }
    }

    async function loadLocale() {
        const langs: I18n[] = [];
        langs.push(await LOCALES[$language].load());
        if ($language !== DEFAULT_LOCALE) {
            langs.push(await LOCALES[DEFAULT_LOCALE].load());
        }
        i18n.set(createI18nUnion(langs));
    }

    onMount(async () => {
        await init();
    });
</script>

<svelte:head>
    <title>Dashboard</title>
    <Theme />
</svelte:head>

<div class="app">
    {#if status.type === 'ready'}
        <slot />
    {:else}
        <div class="window">
            <div class="title" data-tauri-drag-region>
                <img src={title} alt="Logo" />
                <button on:click={() => {
                    exit();
                }} aria-label="Close">
                    <i class="ti ti-x"></i>
                </button>
            </div>
            <div class="status">
                <LoadingStatus bind:status set={setStatus} />
            </div>
            {#if update}
                <div class="update">
                    {#if updateProgress}
                        {#if updateProgress.type === 'restarting'}
                            <span>再起動中...</span>
                        {:else if updateProgress.type === 'updating'}
                            <p>更新中...</p>
                            <p>
                                {updateProgress.downloaded}/{updateProgress.contentLength}
                            </p>
                        {:else if updateProgress.type === 'shutting-down'}
                            <span>シャットダウン中...</span>
                        {/if}
                    {:else}
                        <p>更新があります</p>
                        <small>起動しない場合は更新してください</small>
                        <button on:click={() => {
                            if (!update) return;
                            applyUpdate(update, (value) => {
                                updateProgress = value;
                            });
                        }}>
                            更新
                            <i class="ti ti-arrow-up"></i>
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .window {
        position: fixed;
        inset: 0;
        background: var(--color-bg-1);
        display: flex;
        flex-direction: column;
        font-weight: 600;
    }

    .title {
        background: var(--color-bg-2);
        height: 2rem;
        outline: 1px solid var(--color-outline);
        display: flex;
        align-items: center;
        padding-left: 0.5rem;

        > img {
            margin-right: auto;
            height: 0.75rem;
        }

        > button {
            width: 2rem;
            height: 2rem;
            color: var(--color-1);
            background: none;
            border: none;
            z-index: 1;

            &:hover {
                background: var(--color-1);
                color: var(--color-bg-1);
            }
        }
    }

    .status {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
    }

    .update {
        position: absolute;
        top: 3rem;
        right: 2rem;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        padding: 0.25rem 1rem;
        padding-top: 0;
        border-right: 2px solid var(--color-1);

        > p {
            color: var(--color-1);
        }

        > small {
            color: var(--color-text);
            font-size: 0.8rem;
        }

        > button {
            font-weight: 600;
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border: none;
            border-radius: 2px;
            outline-offset: -1px;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-2);
                outline: 1px solid var(--color-1);
                color: var(--color-1);
            }
        }
    }
</style>

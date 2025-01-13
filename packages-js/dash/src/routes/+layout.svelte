<script lang="ts">
    import { omu } from '$lib/client.js';
    import { i18n } from '$lib/i18n/i18n-context.js';
    import { DEFAULT_LOCALE, LOCALES } from '$lib/i18n/i18n.js';
    import { installed, language } from '$lib/main/settings.js';
    import {
        invoke,
        listen,
        waitForTauri,
        type Progress,
    } from '$lib/tauri.js';
    import { createI18nUnion } from '@omujs/i18n';
    import { DisconnectType, type DisconnectPacket } from '@omujs/omu/network/packet/packet-types.js';
    import '@omujs/ui';
    import { Spinner, Theme } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/api/process';
    import GenerateLogButton from './GenerateLogButton.svelte';
    import './styles.scss';
    import UpdateButton from './UpdateButton.svelte';

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

    let progress: Progress | null = null;
    let percentage = 0;
    let failed = false;

    function lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    let disconnectPacket: DisconnectPacket | null = null;

    async function init() {
        await loadLocale();
        await waitForTauri();
        await listen('server_state', (state) => {
            progress = state.payload;
            failed = FAILED_PROGRESS.includes(progress.type);
            const index = INSTALL_PROGRESS.indexOf(progress.type);
            const {progress: p, total} = progress;
            if (!p || !total) {
                percentage = (index + 1) / INSTALL_PROGRESS.length;
            } else {
                percentage = lerp(index, index + 1, p / total) / INSTALL_PROGRESS.length;
            }
        });
        try {
            await invoke('start_server');
        } catch (e) {
            console.error(e);
            throw e;
        }
        console.log('server started');

        language.subscribe(loadLocale);

        return new Promise<void>((resolve, reject) => {
            omu.onReady(() => {
                resolve();
            });
            omu.network.event.disconnected.listen((packet) => {
                disconnectPacket = packet;
                reject(packet);
            }); 

            try {
                omu.start()
            } catch (e) {
                reject(e);
            }
        });
    }

    async function loadLocale() {
        const lang = await LOCALES[$language].load();
        const fallbackLang = await LOCALES[DEFAULT_LOCALE].load();
        if (lang !== fallbackLang) {
            i18n.set(createI18nUnion([lang, fallbackLang]));
        } else {
            i18n.set(lang);
        }
    }


    async function restart() {
        progress = null;
        await invoke('stop_server');
        await relaunch();
    }

    let promise = init();
</script>

<svelte:head>
    <title>Dashboard</title>
    <meta name="description" content="Svelte demo app" />
    <Theme />
</svelte:head>

<div class="app">
    <main>
        {#if failed}
            <div class="loading" data-tauri-drag-region>
                <div class="container">
                    <p class="failed">
                        起動に失敗しました
                        <i class="ti ti-alert-circle"></i>
                    </p>
                    <div class="state">
                        {#if progress}
                            <p>
                                {PROGRESS_NAME[progress.type]}
                            </p>
                        {/if}
                    </div>
                    <div class="actions">
                        <GenerateLogButton />
                        <UpdateButton />
                        <button class="primary" on:click={async () => {
                            await invoke('clean_environment');
                            await relaunch();
                        }}>
                            環境を再構築
                            <i class="ti ti-reload"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="debug">
                debug:
                {JSON.stringify(progress)}
            </div>
        {:else}
            {#await promise}
                <div class="loading" data-tauri-drag-region>
                    <div class="container">
                        <p class="text">
                            {#if !$installed}
                                インストール中
                            {:else}
                                起動中
                            {/if}
                            <Spinner />
                        </p>
                        <div class="state">
                            {#if progress}
                                <div class="progress">
                                    {#if progress.progress !== undefined && progress.total !== undefined}
                                        {@const percentage = progress.progress / progress.total * 100}
                                        <progress value={progress.progress} max={progress.total}></progress>
                                        <p>
                                            {PROGRESS_NAME[progress.type]}
                                            {progress.progress} / {progress.total} ({Math.round(percentage || 0)}%)
                                        </p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <UpdateButton />
                    </div>
                </div>
                <div class="debug">
                    debug: {JSON.stringify(progress)}
                </div>
            {:then}
                <slot />
            {:catch error}
                <div class="loading" data-tauri-drag-region>
                    <div class="container">
                        <p class="failed">
                            起動に失敗しました
                            <i class="ti ti-alert-circle"></i>
                        </p>
                        <small>
                            {#if disconnectPacket}
                                <code>
                                    エラーコード: {disconnectPacket.type}
                                    <p>{disconnectPacket.message}</p>
                                </code>
                                {#if disconnectPacket.type === DisconnectType.INVALID_TOKEN}
                                    <small>
                                        サーバーの認証に失敗しました
                                    </small>
                                {:else if disconnectPacket.type === DisconnectType.CLOSE}
                                    <small>
                                        サーバーから切断されました
                                    </small>
                                {/if}
                            {:else if progress && FAILED_PROGRESS.includes(progress.type)}
                                <code>
                                    エラーコード: {progress.type}
                                    <p>{progress.msg}</p>
                                </code>
                                <small>
                                    {PROGRESS_NAME[progress.type]}
                                </small>
                            {:else}
                                {error?.message || error || '起動に失敗しました'}
                            {/if}
                        </small>
                    </div>
                    <div class="actions">
                        <GenerateLogButton />
                        <button class="primary" on:click={() => {
                            promise = restart();
                        }}>
                            サーバーを再起動
                            <i class="ti ti-reload"></i>
                        </button>
                        <UpdateButton />
                    </div>
                </div>
                <div class="debug">
                    debug:
                    {JSON.stringify(progress)}
                </div>
            {/await}
        {/if}
    </main>
</div>

<style lang="scss">
    .debug {
        position: fixed;
        bottom: 2rem;
        font-weight: 600;
        font-size: 0.72rem;
        color: var(--color-text);
        opacity: 0.5;
        user-select: all;
        cursor: text;
        width: 100%;
        padding: 0 1rem;
        white-space: wrap;
        text-align: center;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        padding: 3rem 2rem;
        width: 30rem;
        background: var(--color-bg-2);
    }

    .app {
        display: flex;
        flex-direction: column;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }

    main {
        flex: 1;
        overflow: hidden;
    }

    .loading {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 20px;
        font-weight: bold;
        color: var(--color-1);
        background: var(--color-bg-1);
    }

    .failed {
        display: flex;
        align-items: baseline;
        color: #dfa207;
        font-size: 1.475rem;

        > i {
            margin-left: 0.5rem;
            font-size: 1.5rem;
        }
    }

    .text {
        display: flex;
        align-items: baseline;
        gap: 1rem;
    }

    progress {
        margin-bottom: 1rem;
        appearance: none;
        width: 100%;
        height: 2px;
        border: none;

        &::-webkit-progress-bar {
            background: var(--color-outline);
        }

        &::-webkit-progress-value {
            background: var(--color-1);
        }
    }

    .state {
        font-size: 0.8rem;
        color: var(--color-text);
    }

    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;

        > button {
            padding: 0.5rem 1rem;
            border: none;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            color: var(--color-1);
            font-size: 0.8rem;
            font-weight: bold;

            > i {
                margin-left: 0.1rem;
            }

            &:hover {
                background: var(--color-1);
                color: var(--color-bg-1);
            }
        }

        > .primary {
            background: var(--color-1);
            color: var(--color-bg-1);
        }
    }

    code {
        display: block;
        padding: 0.5rem;
        color: var(--color-text);
        font-size: 0.8rem;
    }

    button {
        cursor: pointer;
        border-radius: 2px;
    }
</style>

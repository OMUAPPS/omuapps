<script lang="ts">
    import { omu } from '$lib/client.js';
    import { screenContext } from '$lib/common/screen/screen.js';
    import { i18n } from '$lib/i18n/i18n-context.js';
    import { DEFAULT_LOCALE, LOCALES } from '$lib/i18n/i18n.js';
    import UpdateScreen from '$lib/main/screen/UpdateScreen.svelte';
    import { installed, language } from '$lib/main/settings.js';
    import {
        invoke,
        listen,
        waitForTauri,
        type Progress,
        type PROGRESS_EVENT,
    } from '$lib/utils/tauri.js';
    import { createI18nUnion } from '@omujs/i18n';
    import { NetworkStatus } from '@omujs/omu/network/network.js';
    import '@omujs/ui';
    import { Theme, Tooltip } from '@omujs/ui';
    import { checkUpdate } from '@tauri-apps/api/updater';
    import './styles.scss';

    const ERROR_NAMES: Record<keyof PROGRESS_EVENT, string> = {
        PythonDownloading: '動作環境1をダウンロード中(1/6)',
        PythonUnkownVersion: '内部Pythonのバージョンが不明です',
        PythonChecksumFailed: '内部Pythonの認証に失敗しました',
        PythonExtracting: '動作環境1をインストール中(2/6)',
        UvDownloading: '動作環境2をダウンロード中(3/6)',
        UvExtracting: '動作環境2をインストール中(4/6)',
        UvCleanupOldVersions: '古い動作環境を削除中',
        UvCleanupOldVersionsFailed: '古い動作環境の削除に失敗しました',
        UvUpdatePip: '動作環境3を更新中(5/6)',
        UvUpdatePipFailed: '動作環境3の更新に失敗しました',
        UvUpdateRequirements: '動作環境4を更新中(6/6)',
        UvUpdateRequirementsFailed: '動作環境4の更新に失敗しました',
        ServerTokenReadFailed: 'APIの認証情報の読み込みに失敗しました',
        ServerTokenWriteFailed: 'APIの認証情報の書き込みに失敗しました',
        ServerCreateDataDirFailed: 'データフォルダの作成に失敗しました',
        ServerStarting: 'サーバーを起動中...',
        ServerStartFailed: 'サーバーの起動に失敗しました',
        ServerStarted: 'サーバーが起動しました',
        ServerAlreadyStarted: 'サーバーは既に起動しています',
    };
    const INSTALL_PROGRESS = [
        'PythonDownloading',
        'PythonExtracting',
        'UvDownloading',
        'UvExtracting',
        'UvUpdatePip',
        'UvUpdateRequirements',
        'ServerStarting',
    ];
    const FAILED_PROGRESS = [
        'PythonChecksumFailed',
        'UvCleanupOldVersionsFailed',
        'UvUpdatePipFailed',
        'UvUpdateRequirementsFailed',
        'ServerTokenReadFailed',
        'ServerTokenWriteFailed',
        'ServerCreateDataDirFailed',
        'ServerStartFailed',
    ];

    let progress: Progress | null = null;
    $: state = progress ? (Object.keys(progress)[0] as keyof PROGRESS_EVENT) : null;
    $: stateMessage = state ? ERROR_NAMES[state] : '';
    let percentage = 0;
    $: percentage =
        progress && state ? INSTALL_PROGRESS.indexOf(state) / INSTALL_PROGRESS.length : 0;
    $: failed = state ? FAILED_PROGRESS.includes(state) : false;

    async function checkNewVersion() {
        const update = await checkUpdate();
        const { manifest, shouldUpdate } = update;

        if (shouldUpdate && manifest) {
            screenContext.push(UpdateScreen, { manifest });
        }
    }

    async function init() {
        await loadLocale();
        await waitForTauri();
        await listen('server_state', (state) => {
            progress = state.payload;
        });
        try {
            await invoke('start_server');
        } catch (e) {
            console.error(e);
        }
        console.log('server started');

        omu.start();
        language.subscribe(loadLocale);
        await new Promise<void>((resolve, reject) => {
            omu.onReady(resolve);
            omu.network.event.status.listen((status) => {
                if (status === NetworkStatus.ERROR) {
                    reject(status);
                }
            });
        });

        await checkNewVersion();

        return new Promise<void>((resolve, reject) => {
            omu.onReady(resolve);
            omu.network.event.status.listen((status) => {
                if (status === NetworkStatus.ERROR) {
                    reject(status);
                }
            });
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

    async function generateLogFile(): Promise<void> {
        await invoke('generate_log_file');
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
                <p class="failed">
                    起動に失敗しました
                    <i class="ti ti-alert-circle" />
                </p>
                <div class="state">
                    {#if stateMessage}
                        <p>{stateMessage}</p>
                        <small>{JSON.stringify(progress)}</small>
                    {/if}
                </div>
                <div>
                    <button on:click={generateLogFile} class="generate-log">
                        <Tooltip>調査用のログファイルを生成します</Tooltip>
                        ログを生成
                        <i class="ti ti-file" />
                    </button>
                    <button on:click={checkNewVersion} class="update">
                        アップデートを確認
                        <i class="ti ti-reload" />
                    </button>
                </div>
            </div>
        {:else}
            {#await promise}
                <div class="loading" data-tauri-drag-region>
                    <p class="text">
                        {#if !$installed}
                            インストール中...
                        {:else}
                            loading...
                        {/if}
                        <i class="ti ti-loader-2" />
                    </p>
                    <div class="state">
                        <progress value={percentage} />
                        {#if stateMessage}
                            <p>{stateMessage}</p>
                            <small>{JSON.stringify(progress)}</small>
                        {/if}
                    </div>
                    <button on:click={checkNewVersion} class="update">
                        アップデートを確認
                        <i class="ti ti-reload" />
                    </button>
                </div>
            {:then}
                <slot />
            {:catch error}
                <div class="loading" data-tauri-drag-region>
                    {error.message}
                    <p>
                        {JSON.stringify(progress)}
                    </p>
                    <button on:click={checkNewVersion} class="update">
                        アップデートを確認
                        <i class="ti ti-reload" />
                    </button>
                </div>
            {/await}
        {/if}
    </main>
</div>

<style lang="scss">
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

        > i {
            margin-left: auto;
            animation: spin 1s linear infinite;
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
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

        > small {
            opacity: 0.6;
        }
    }

    .row {
        display: flex;
        flex-direction: row;
        gap: 4rem;
        align-items: center;
    }

    .generate-log {
        padding: 0.5rem 1rem;
        border: none;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
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

    .update {
        padding: 0.5rem 1rem;
        border: none;
        outline: 1px solid var(--color-1);
        background: var(--color-1);
        color: var(--color-bg-1);
        font-size: 0.8rem;
        font-weight: bold;
    }
</style>

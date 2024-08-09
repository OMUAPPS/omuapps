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
    import { Theme } from '@omujs/ui';
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

    let serverState: Progress | null = null;
    $: stateMessage = serverState
        ? ERROR_NAMES[Object.keys(serverState)[0] as keyof PROGRESS_EVENT]
        : '';
    let progress = 0;
    $: progress =
        serverState && INSTALL_PROGRESS.includes(Object.keys(serverState)[0])
            ? INSTALL_PROGRESS.indexOf(Object.keys(serverState)[0]) / INSTALL_PROGRESS.length
            : progress;

    async function init() {
        await loadLocale();
        await waitForTauri();
        await listen('server_state', (state) => {
            serverState = state.payload;
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

        const update = await checkUpdate();
        const { manifest, shouldUpdate } = update;

        if (shouldUpdate && manifest) {
            screenContext.push(UpdateScreen, { manifest });
        }

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
    let promise = init();
</script>

<svelte:head>
    <title>Dashboard</title>
    <meta name="description" content="Svelte demo app" />
    <Theme />
</svelte:head>

<div class="app">
    <main>
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
                    <progress value={progress} />
                    {#if stateMessage}
                        <p>{stateMessage}</p>
                        <small>{JSON.stringify(serverState)}</small>
                    {/if}
                </div>
            </div>
        {:then}
            <slot />
        {:catch error}
            <div class="loading" data-tauri-drag-region>
                {error.message}
                <p>
                    {JSON.stringify(serverState)}
                </p>
            </div>
        {/await}
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
</style>

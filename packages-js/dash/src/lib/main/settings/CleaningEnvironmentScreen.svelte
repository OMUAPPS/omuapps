<script lang="ts">
    import { omu } from '$lib/client.js';
    import { type ScreenHandle } from '$lib/screen/screen.js';
    import Screen from '$lib/screen/Screen.svelte';
    import { invoke, listen, type Progress } from '$lib/tauri.js';
    import { Spinner } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/api/process';
    import { onMount } from 'svelte';

    export let screen: {
        handle: ScreenHandle;
        props: undefined;
    };

    const ERROR_MESSAGES = {
        DevMode: {
            title: '開発モードのため環境を削除できません',
            hint: 'ビルドしてからお試しください',
        },
        PythonError: {
            title: 'Python環境の構築に失敗しました',
            hint: 'OBS Studioを閉じてから再度試すか、手動での削除をお試しください',
        },
        ServerError: {
            title: 'サーバーの停止に失敗しました',
            hint: 'OBS Studioを閉じてから再度試すか、手動での停止をお試しください',
        },
        RemovePythonError: {
            title: '動作環境の削除に失敗しました',
            hint: 'OBS Studioを閉じてから再度試すか、手動での削除をお試しください',
        },
        RemoveUvError: {
            title: 'uv環境の削除に失敗しました',
            hint: 'OBS Studioを閉じてから再度試すか、手動での削除をお試しください',
        },
    }

    let progress: Progress | null = null;

    onMount(() => {
        const unlisten = listen('server_state', (state) => {
            progress = state.payload;
        });
        return async () => {
            (await unlisten)();
        };
    });

    type ErrorType = { type: keyof typeof ERROR_MESSAGES, message: string };
    let errorMessage: ErrorType | null = null;

    async function cleanEnvironment(): Promise<void> {
        omu.server.shutdown();
        try {
            await invoke('clean_environment');
        } catch (e) {
            errorMessage = e as ErrorType;
            throw e;
        }
        await relaunch();
    }

    let cleanPromise: Promise<void> = cleanEnvironment();
</script>

<Screen {screen} title="" windowed={false} disableDecorations disableClose>
    <div class="screen">
        <div class="container">
            {#await cleanPromise}
                <h1>
                    環境の再構築中
                    <Spinner />
                </h1>
                <small>
                    {#if progress?.type === 'PythonRemoving'}
                        Python環境を削除中...
                    {:else if progress?.type === 'UvRemoving'}
                        uv環境を削除中...
                    {/if}
                    {JSON.stringify(progress)}
                    {#if progress?.progress && progress?.total}
                        {progress?.progress} / {progress?.total}
                        <progress value={progress?.progress} max={progress?.total} />
                    {/if}
                </small>
            {:then}
                <h1>
                    環境の削除が完了しました
                    <i class="ti ti-check" />
                </h1>
            {:catch error}
                <i class="ti ti-alert-circle" />
                {#if errorMessage}
                    {@const error = ERROR_MESSAGES[errorMessage.type]}
                    <div class="error">
                        <h1>
                            環境のリセットに失敗しました
                        </h1>
                        <p>{error.title}</p>
                        <small><code>{error.hint}</code></small>
                    </div>
                    {#if errorMessage.type === 'RemovePythonError'}
                        <button on:click={() => {
                            invoke('open_python_path');
                        }}>
                            フォルダーを開く
                            <i class="ti ti-folder" />
                        </button>
                    {:else if errorMessage.type === 'RemoveUvError'}
                        <button on:click={() => {
                            invoke('open_uv_path');
                        }}>
                            フォルダーを開く
                            <i class="ti ti-folder" />
                        </button>
                    {/if}
                {:else}
                    <p>エラー: <code>{error.message}</code></p>
                {/if}
                <div class="actions">
                    <button on:click={() => {
                        cleanPromise = cleanEnvironment();
                    }}>
                        もう一度試す
                        <i class="ti ti-reload" />
                    </button>
                    <button on:click={() => {
                        relaunch();
                    }}>
                        再起動
                        <i class="ti ti-rotate" />
                    </button>
                </div>
            {/await}
        </div>
    </div>
</Screen>

<style lang="scss">
    .screen {
        position: absolute;
        inset: 0;
        background: var(--color-bg-1);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2rem;
    }
    
    h1 {
        color: var(--color-1);
    }

    .ti-alert-circle {
        font-size: 3rem;
        color: #dfa207;
    }

    .error {
        margin-top: 1rem;
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--color-text);

        > small {
            margin-top: 1rem;
        }
    }

    small {
        font-size: 0.75rem;
        font-weight: 600;
        background: var(--color-bg-2);
        padding: 0.5rem 1rem;
        color: var(--color-text);
    }

    code {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.9rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        margin: 0.25rem;
        padding: 0.1rem 0.25rem;
        user-select: text;
        cursor: text;
    }

    .actions {
        margin-top: 2rem;
        padding-top: 1rem;
        width: 30rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border-top: 1px solid var(--color-outline);
    }

    button {
        padding: 0.5rem 1rem;
        border: none;
        background: var(--color-1);
        color: var(--color-bg-2);
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        border-radius: 2px;
        width: fit-content;

        &:hover {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            background: var(--color-bg-1);
            color: var(--color-1);
        }
    }
</style>

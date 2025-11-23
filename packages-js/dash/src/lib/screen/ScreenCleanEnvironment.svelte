<script lang="ts">
    import { omu } from '$lib/client.js';
    import { type ScreenHandle } from '$lib/screen/screen.js';
    import Screen from '$lib/screen/Screen.svelte';
    import { Button, Spinner } from '@omujs/ui';
    import { invoke } from '@tauri-apps/api/core';
    import { relaunch } from '@tauri-apps/plugin-process';

    interface Props {
        handle: ScreenHandle;
        props: undefined;
    }

    let { handle }: Props = $props();

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
    };

    type ErrorType = { type: keyof typeof ERROR_MESSAGES; message: string };
    let errorMessage: ErrorType | null = $state(null);

    async function cleanEnvironment(): Promise<void> {
        if (omu.ready) {
            await omu.server.shutdown();
        }
        try {
            await invoke('clean_environment');
        } catch (e) {
            errorMessage = e as ErrorType;
            throw e;
        }
        await relaunch();
    }

    let cleanPromise: Promise<void> = $state(cleanEnvironment());
</script>

<Screen {handle} disableClose>
    <div class="screen">
        {#await cleanPromise}
            <div class="container">
                <h1>
                    環境の再構築中
                    <Spinner />
                </h1>
            </div>
        {:then}
            <h1>
                環境の削除が完了しました
                <i class="ti ti-check"></i>
            </h1>
        {:catch error}
            <div class="container">
                <i class="ti ti-alert-circle"></i>
                {#if errorMessage}
                    {@const error = ERROR_MESSAGES[errorMessage.type]}
                    <div class="error">
                        <h1>環境のリセットに失敗しました</h1>
                        <p>{error.title}</p>
                        <small><code>{error.hint}</code></small>
                    </div>
                    {#if errorMessage.type === 'RemovePythonError'}
                        <Button onclick={() => {
                            invoke('open_python_path');
                        }}>
                            フォルダーを開く
                            <i class="ti ti-folder"></i>
                        </Button>
                    {:else if errorMessage.type === 'RemoveUvError'}
                        <Button onclick={() => {
                            invoke('open_uv_path');
                        }}>
                            フォルダーを開く
                            <i class="ti ti-folder"></i>
                        </Button>
                    {/if}
                {:else}
                    <p>エラー: <code>{error.message}</code></p>
                {/if}
            </div>
            <div class="actions">
                <Button primary onclick={() => {
                    cleanPromise = cleanEnvironment();
                }}>
                    もう一度試す
                    <i class="ti ti-reload"></i>
                </Button>
                <Button primary onclick={() => {
                    relaunch();
                }}>
                    再起動
                    <i class="ti ti-rotate"></i>
                </Button>
            </div>
        {/await}
    </div>
</Screen>

<style lang="scss">
    .screen {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem 2rem;
        width: 30;
        background: var(--color-bg-2);
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
        width: 30rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
</style>

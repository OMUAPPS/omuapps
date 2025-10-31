<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import { type ScreenHandle } from '$lib/screen/screen.js';
    import Screen from '$lib/screen/Screen.svelte';
    import { invoke, uninstallProgress, type UninstallError } from '$lib/tauri';
    import { Button, Spinner, Tooltip } from '@omujs/ui';
    import { error } from '@tauri-apps/plugin-log';
    import { exit, relaunch } from '@tauri-apps/plugin-process';
    import { onMount, tick } from 'svelte';
    import ProgressBar from '../../../routes/_components/ProgressBar.svelte';

    export let screen: {
        handle: ScreenHandle;
        props: undefined;
    };

    let state: {
        type: 'initializing';
    } | {
        type: 'yesno';
        remaining: number;
        accept: () => void;
        cancel: () => void;
    } | {
        type: 'uninstalling';
    } | {
        type: 'done';
    } | {
        type: 'failed';
        message: string;
    } = { type: 'initializing' };

    async function init() {
        const update = async (resolve: (confirmed: boolean) => void) => {
            const start = performance.now();
            const timeout = start + 5000;
            let rejected = false;
            while (!rejected) {
                const remaining = timeout - performance.now();
                await new Promise<void>((r) => setTimeout(r, 100));
                state = {
                    type: 'yesno',
                    remaining,
                    accept: () => {
                        rejected = true;
                        resolve(true);
                    },
                    cancel: () => {
                        rejected = true;
                        resolve(false);
                    },
                };
                if (remaining <= 0) {
                    return;
                }
            }
        };
        const confirmed = await new Promise<boolean>((resolve) => update(resolve));
        if (!confirmed) {
            screen.handle.pop();
            return;
        }
        state = { type: 'uninstalling' };
        await tick();
        try {
            await invoke('uninstall');
        } catch (err) {
            const reason = err as UninstallError;
            const message = `Uninstallation failed: ${JSON.stringify(reason)}`;
            console.error(message);
            await error(message);
            state = { type: 'failed', message: JSON.stringify(reason, null, 2) };
            return;
        }
        state = { type: 'done' };
    }

    onMount(() => {
        init();
    });
</script>

<Screen {screen} disableClose>
    <div class="screen">
        {#if state.type === 'yesno'}
            <h2>全て消えます</h2>
            <small>今までのコメント、今までのアプリのデータ全て消えます</small>
            <small>何かしらバックアップがない場合</small>
            <div class="actions">
                <Button onclick={state.cancel}>キャンセル</Button>
                <Button onclick={state.accept} primary disabled={state.remaining > 0}>
                    {#if state.remaining > 0}
                        <Tooltip>
                            {Math.ceil(state.remaining / 1000)}秒後にアンインストールできます。
                        </Tooltip>
                    {/if}
                    アンインストール
                </Button>
            </div>
        {:else if state.type === 'uninstalling'}
            <h2>アンインストール中</h2>
            {#if !$uninstallProgress}
                <Spinner />
            {:else}
                {#if $uninstallProgress.type === 'Python'}
                    {$t(`setup.progress.${$uninstallProgress.type}.${$uninstallProgress.progress.type}`)}
                    <ProgressBar progress={$uninstallProgress.progress} />
                {:else if $uninstallProgress.type === 'PythonRemoving' || $uninstallProgress.type === 'UvRemoving' || $uninstallProgress.type === 'AppDataRemoving'}
                    <ProgressBar progress={$uninstallProgress.progress} />
                {:else if $uninstallProgress.type === 'PluginRemoving'}
                    プラグインを削除しています...
                {/if}
            {/if}
        {:else if state.type === 'done'}
            <h2>アンインストールが完了しました</h2>
            <small>アプリを削除するには、このままアプリケーションを閉じて</small>
            <small>アンインストーラーを起動してください。</small>
            <div class="actions">
                <Button primary onclick={async () => {
                    await exit();
                }}>
                    アプリを閉じる
                </Button>
            </div>
        {:else if state.type === 'failed'}
            <h2>アンインストールに失敗しました</h2>
            <div class="actions">
                <Button primary onclick={async () => {
                    await relaunch();
                }}>
                    再起動
                </Button>
            </div>
            <pre>{state.message}</pre>
        {/if}
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
        padding: 0 2rem;
    }

    .actions {
        margin-top: 1rem;
        display: flex;
        gap: 1rem;
    }

    h2 {
        margin-bottom: 2rem;
    }

    pre {
        background: var(--color-bg-1);
        padding: 1rem;
        margin-top: 2rem;
        border-radius: 0.5rem;
        max-height: 30vh;
        overflow: auto;
        text-align: left;
        width: 100%;
    }
</style>

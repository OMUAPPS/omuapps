<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import { cleanProgress, invoke, type CleanError } from '$lib/tauri.js';
    import { Button, Spinner } from '@omujs/ui';
    import { error } from '@tauri-apps/plugin-log';
    import { relaunch } from '@tauri-apps/plugin-process';
    import ProgressBar from './ProgressBar.svelte';

    interface Props {
        retry: () => void;
        message: string | undefined;
    }

    let { retry, message }: Props = $props();

    let restoreState: {
        type: 'idle';
    } | {
        type: 'cleaning';
    } | {
        type: 'cleaning_failed';
        reason: CleanError;
    } = $state({ type: 'idle' });

    async function cleanEnvironment() {
        try {
            restoreState = { type: 'cleaning' };
            await invoke('clean_environment');
            retry();
        } catch (err) {
            restoreState = { type: 'cleaning_failed', reason: err as CleanError };
            error(`Failed to clean environment: ${JSON.stringify(err)}`);
        }
    }

    async function restart() {
        try {
            await invoke('stop_server');
        } catch (err) {
            error(`Failed to clean environment: ${JSON.stringify(err)}`);
        }
        await relaunch();
    }
</script>

<div class="restore">
    {#if restoreState.type === 'idle'}
        <div class="actions">
            <Button primary onclick={restart}>
                再起動
                <i class="ti ti-rotate"></i>
            </Button>
            <Button primary onclick={cleanEnvironment}>
                再構築
                <i class="ti ti-trash-x"></i>
            </Button>
        </div>
        <small>報告するときは以下からログを生成してください</small>
        <div class="actions">
            <Button onclick={() => invoke('generate_log_file')} >
                {#snippet children({ promise })}
                                {#if promise}
                        {#await promise}
                            ログを生成中
                            <Spinner />
                        {:then}
                            ログを生成しました
                        {:catch e}
                            ログの生成に失敗しました: {e}
                        {/await}
                    {:else}
                        ログを生成
                        <i class="ti ti-file"></i>
                    {/if}
                                            {/snippet}
                        </Button>
        </div>
    {:else if restoreState.type === 'cleaning'}
        <small>
            {#if $cleanProgress}
                {#if $cleanProgress.type === 'Python'}
                    {$t(`setup.progress.${$cleanProgress.type}.${$cleanProgress.progress.type}`)}
                    <ProgressBar progress={$cleanProgress.progress} />
                {:else if $cleanProgress.type === 'PythonRemoving' || $cleanProgress.type === 'UvRemoving'}
                    <ProgressBar progress={$cleanProgress.progress} />
                {/if}
            {/if}
        </small>
    {:else if restoreState.type === 'cleaning_failed'}
        <small>
            再構築に失敗しました: {restoreState.reason.type}
            {JSON.stringify(restoreState.reason, null, 2)}
        </small>
    {/if}
</div>
{#if message}
    <div class="message">
        <p>エラーメッセージ</p>
        <textarea>{message}</textarea>
    </div>
{/if}

<style lang="scss">
    .restore {
        margin-top: auto;
        display: flex;
        flex-direction: column;
    }

    small {
        margin-top: 2rem;
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1rem;
    }

    .message {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 20%;
        margin: 2rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.8rem;

        > textarea {
            flex: 1;
            width: 100%;
            resize: none;
            background: var(--color-bg-1);
            border: 1px solid var(--color-outline);
            color: var(--color-text);
            padding: 0.5rem;
            font-family: monospace;
            font-size: 0.875rem;
        }
    }
</style>

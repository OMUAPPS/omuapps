<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import { cleanProgress, invoke, type CleanError } from '$lib/tauri.js';
    import { Button, Spinner } from '@omujs/ui';
    import { relaunch } from '@tauri-apps/plugin-process';
    import ProgressBar from './ProgressBar.svelte';

    export let retry: () => void;

    let restoreState: {
        type: 'idle';
    } | {
        type: 'cleaning';
    } | {
        type: 'cleaning_failed';
        reason: CleanError;
    } = { type: 'idle' };

    async function cleanEnvironment() {
        try {
            restoreState = { type: 'cleaning' };
            await invoke('clean_environment');
        } catch (err) {
            restoreState = { type: 'cleaning_failed', reason: err as CleanError };
        }
        retry();
    }

    async function restart() {
        await relaunch();
    }
</script>

<div class="restore">
    {#if restoreState.type === 'idle'}
        <div class="actions">
            <Button primary onclick={cleanEnvironment}>
                再構築
                <i class="ti ti-trash-x"></i>
            </Button>
            <Button primary onclick={restart}>
                再起動
                <i class="ti ti-rotate"></i>
            </Button>
        </div>
        <small>報告するときは以下からログを生成してください</small>
        <div class="actions">
            <Button onclick={() => invoke('generate_log_file')} let:promise>
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
</style>

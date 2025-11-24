<script lang="ts">
    import { applyUpdate, type UpdateEvent } from '$lib/tauri';
    import { Button } from '@omujs/ui';
    import type { AppState } from '../stores';
    import ProgressBar from './ProgressBar.svelte';

    export let state: Extract<AppState, { type: 'update' }>;

    let updateState: {
        type: 'progress';
        event: UpdateEvent;
    } | {
        type: 'failed';
        error: string;
    } | undefined = undefined;

    function formatError(msg: unknown): string {
        if (msg instanceof Error) {
            return msg.message;
        }
        return String(msg);
    }
</script>

{#if !updateState}
    <Button onclick={() => {state.resolve();}}>
        このバージョンで続行
        <i class="ti ti-cancel"></i>
    </Button>
    <Button primary onclick={async () => {
        try {
            await applyUpdate(state.update, (event) => {
                updateState = {
                    type: 'progress',
                    event,
                };
            });
        } catch (err) {
            updateState = {
                type: 'failed',
                error: formatError(err),
            };
        }
    }}>
        アップデート
        <i class="ti ti-arrow-right"></i>
    </Button>
{:else if updateState.type === 'progress'}
    {@const { event } = updateState}
    {#if event.type === 'shutting-down'}
        <div class="progress">
            <p>アプリケーションを終了しています...</p>
        </div>
    {:else if event.type === 'updating'}
        <div class="progress">
            <ProgressBar progress={{
                msg: '',
                progress: event.downloaded,
                total: event.contentLength,
            }} />
            <p>アップデートを適用しています...</p>
        </div>
    {:else if event.type === 'restarting'}
        <div class="progress">
            <p>アプリケーションを再起動しています...</p>
        </div>
    {/if}
{:else if updateState.type === 'failed'}
    <div class="error">
        <p>アップデートに失敗しました: {updateState.error}</p>
        <Button primary onclick={() => {state.resolve();}}>
            このバージョンで続行
            <i class="ti ti-cancel"></i>
        </Button>
    </div>
{/if}

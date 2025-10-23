<script lang="ts">
    import { applyUpdate, checkUpdate, type UpdateEvent } from '$lib/tauri.js';
    import { VERSION } from '$lib/version';
    import { Button } from '@omujs/ui';
    import type { Update } from '@tauri-apps/plugin-updater';
    import { onMount } from 'svelte';

    let update: Update | null = null;
    let updateProgress: UpdateEvent | null = null;

    onMount(async () => {
        try {
            update = await checkUpdate();
        } catch (e) {
            console.error('Failed to check update', e);
        }
    });
</script>

<div class="update">
    {#if update}
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
            <small>起動しない場合は更新をお試しください</small>
            <Button primary onclick={async () => {
                if (!update) return;
                await applyUpdate(update, (value) => {
                    updateProgress = value;
                });
            }}>
                更新
                <i class="ti ti-arrow-up"></i>
            </Button>
        {/if}
    {:else}
        <p>最新の状態です {VERSION}</p>
    {/if}
</div>

<style lang="scss">
    .update {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        padding: 0.25rem 1rem;
        padding-top: 0;

        > p {
            color: var(--color-1);
            font-size: 1rem;
        }

        > small {
            color: var(--color-text);
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
        }
    }
</style>

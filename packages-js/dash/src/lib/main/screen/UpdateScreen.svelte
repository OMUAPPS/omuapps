<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import Screen from '$lib/screen/Screen.svelte';
    import type { ScreenHandle } from '$lib/screen/screen.js';
    import { applyUpdate, type UpdateEvent } from '$lib/tauri.js';
    import { Button } from '@omujs/ui';
    import { type Update } from '@tauri-apps/plugin-updater';

    interface Props {
        handle: ScreenHandle;
        props: {
            update: Update;
        };
    }

    let { handle, props }: Props = $props();
    const { update } = props;
    const date = update.date && new Date(update.date.replace(/:00$/, ''));

    let updateEvent: UpdateEvent | null = $state(null);
</script>

<Screen {handle}>
    {#if !updateEvent}
        <div class="info">
            <h3>
                新しいバージョンが利用可能です🎉
                <hr />
                v{update.version}
                {#if date}
                    <small>
                        {date.toLocaleDateString()}
                        {date.toLocaleTimeString()}
                    </small>
                {/if}
            </h3>
            <div class="actions">
                <Button onclick={handle.pop}>
                    スキップ
                    <i class="ti ti-x"></i>
                </Button>
                <Button primary onclick={() => applyUpdate(update, (progress) => updateEvent = progress)}>
                    アップデート
                    <i class="ti ti-arrow-right"></i>
                </Button>
            </div>
        </div>
    {:else if updateEvent.type === 'updating'}
        <div class="info">
            <h3>新しいバージョンをダウンロードしています...</h3>
            <div>
                <progress value={updateEvent.downloaded} max={updateEvent.contentLength}></progress>
                <small>
                    {updateEvent.downloaded}
                    <i class="ti ti-slash"></i>
                    {updateEvent.contentLength}
                </small>
            </div>
        </div>
    {:else if updateEvent.type === 'shutting-down'}
        <div class="info">
            <h3>サーバーを終了しています...</h3>
        </div>
    {:else if updateEvent.type === 'restarting'}
        <div class="info">
            <h3>インストーラーを起動しています...</h3>
        </div>
    {/if}

    {#snippet info()}
        <Document source={update.body ?? ''} />
    {/snippet}
</Screen>

<style lang="scss">
    .info {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        height: 100%;
        padding: 1rem;
        border-radius: 0.5rem;
        color: var(--color-1);
    }

    hr {
        width: 100%;
        margin: 0.5rem 0;
        border: none;
        border-top: 1px solid var(--color-1);
    }

    small {
        display: block;
        font-size: 0.7rem;
        color: var(--color-1);
    }

    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    progress {
        width: 16rem;
        height: 6px;
        border: none;
        background: var(--color-bg-1);
        color: var(--color-1);
        border-radius: 0.5rem;

        &::-webkit-progress-bar {
            background: var(--color-bg-1);
            border-radius: 0.5rem;
        }

        &::-webkit-progress-value {
            background: var(--color-1);
            border-radius: 0.5rem;
        }
    }
</style>

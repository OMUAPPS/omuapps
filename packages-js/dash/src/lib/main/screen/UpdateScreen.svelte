<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import Screen from '$lib/screen/Screen.svelte';
    import type { ScreenHandle } from '$lib/screen/screen.js';
    import { applyUpdate, type UpdateEvent } from '$lib/tauri.js';
    import { Button } from '@omujs/ui';
    import { type Update } from '@tauri-apps/plugin-updater';

    export let screen: {
        handle: ScreenHandle;
        props: {
            update: Update;
        };
    };
    const { update } = screen.props;
    const date = update.date && new Date(update.date.replace(/:00$/, ''));

    let state: UpdateEvent | null = null;
</script>

<Screen {screen}>
    {#if !state}
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
                <Button onclick={screen.handle.pop}>
                    スキップ
                    <i class="ti ti-x"></i>
                </Button>
                <Button primary onclick={() => applyUpdate(update, (progress) => state = progress)}>
                    アップデート
                    <i class="ti ti-arrow-right"></i>
                </Button>
            </div>
        </div>
    {:else if state.type === 'updating'}
        <div class="info">
            <h3>新しいバージョンをダウンロードしています...</h3>
            <div>
                <progress value={state.downloaded} max={state.contentLength}></progress>
                <small>
                    {state.downloaded}
                    <i class="ti ti-slash"></i>
                    {state.contentLength}
                </small>
            </div>
        </div>
    {:else if state.type === 'shutting-down'}
        <div class="info">
            <h3>サーバーを終了しています...</h3>
        </div>
    {:else if state.type === 'restarting'}
        <div class="info">
            <h3>インストーラーを起動しています...</h3>
        </div>
    {/if}

    <Document source={update.body ?? ''} slot="info" />
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

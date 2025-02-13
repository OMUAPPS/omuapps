<script lang="ts">
    import { invoke } from '$lib/tauri.js';
    import { Spinner } from '@omujs/ui';

    export let restart: () => void;
    export let cleanEnvironment: () => void;

    let logPromise: Promise<unknown> | null = null;
</script>
<div class="actions">
    <button on:click={restart}>
        再起動
        <i class="ti ti-rotate-clockwise"></i>
    </button>
    <button on:click={cleanEnvironment}>
        環境を再構築
        <i class="ti ti-trash-x"></i>
    </button>
    <!-- <button on:click={() => invoke('generate_log_file')}>
        ログを生成
    </button> -->
    {#if logPromise}
        <button disabled>
            ログを生成中
            <Spinner />
        </button>
    {:else}
        <button on:click={() => {
            logPromise = invoke('generate_log_file');
            logPromise.finally(() => {
                logPromise = null;
            });
        }}>
            ログを生成
            <i class="ti ti-file"></i>
        </button>
    {/if}
</div>

<style lang="scss">
    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        margin-bottom: 2rem;

        > button {
            padding: 0.5rem 1rem;
            background: var(--color-1);
            color: var(--color-bg-2);
            border: none;
            border-radius: 2px;
            font-weight: 600;
            cursor: pointer;

            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }
</style>

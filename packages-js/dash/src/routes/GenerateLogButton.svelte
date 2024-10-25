<script lang="ts">
    import { invoke } from '$lib/tauri.js';
    import { Spinner, Tooltip } from '@omujs/ui';

    let generateLogPromise: Promise<string> | null = null;

    async function generateLogFile(): Promise<void> {
        generateLogPromise = invoke('generate_log_file').finally(() => {
            generateLogPromise = null;
        });
    }
</script>

{#if generateLogPromise}
    <small>
        ログを生成中...
        <Spinner />
    </small>
{:else}
    <button on:click={generateLogFile} class="generate-log">
        <Tooltip>調査用のログファイルを生成します</Tooltip>
        ログを生成
        <i class="ti ti-file"></i>
    </button>
{/if}

<style lang="scss">
    button {
        padding: 0.5rem 1rem;
        border: none;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        color: var(--color-1);
        font-size: 0.8rem;
        font-weight: bold;

        > i {
            margin-left: 0.1rem;
        }

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }
    }

    small {
        font-size: 0.8rem;
        color: var(--color-1);
    }
</style>

<script lang="ts">
    import { invoke } from '$lib/tauri.js';
    import { Button, Spinner } from '@omujs/ui';

    export let restart: () => void;
    export let cleanEnvironment: () => void;
</script>
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
    <Button primary onclick={restart}>
        再起動
        <i class="ti ti-rotate"></i>
    </Button>
    <Button primary onclick={cleanEnvironment}>
        環境を再構築
        <i class="ti ti-trash-x"></i>
    </Button>
</div>

<style lang="scss">
    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        margin-bottom: 2rem;
    }
</style>

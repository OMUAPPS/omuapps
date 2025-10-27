<script lang="ts">
    import { startProgress } from '$lib/tauri';
    import ProgressBar from './ProgressBar.svelte';

</script>

<div class="step">
    {#if $startProgress}
        {#if $startProgress.type === 'Python'}
            <ProgressBar progress={$startProgress.progress} />
        {:else if $startProgress.type === 'Uv' &&
            (
                $startProgress.progress.type === 'Downloading' ||
                $startProgress.progress.type === 'Extracting' ||
                $startProgress.progress.type === 'UvCleanupOldVersions'
            )}
            <ProgressBar progress={$startProgress.progress} />
        {/if}
    {/if}
</div>

<style lang="scss">
    .step {
        display: flex;
        flex-direction: column;
    }
</style>

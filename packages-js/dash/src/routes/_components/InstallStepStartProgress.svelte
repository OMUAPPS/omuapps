<script lang="ts">
    import { t } from '$lib/i18n/i18n-context';
    import { startProgress } from '$lib/tauri';
</script>

<small>
    {#if $startProgress}
        {#if $startProgress.type === 'Python'}
            <progress value={$startProgress.progress.progress / $startProgress.progress.total} />
        {:else if $startProgress.type === 'Uv' &&
            (
                $startProgress.progress.type === 'Downloading' ||
                $startProgress.progress.type === 'Extracting' ||
                $startProgress.progress.type === 'UvCleanupOldVersions'
            )}
            <progress value={$startProgress.progress.progress / $startProgress.progress.total} />
        {/if}
        {$t(`setup.progress.${$startProgress.type}.${$startProgress.progress.type}`)}
    {/if}
</small>

<script lang="ts">
    import { AssetPage } from '@omujs/ui';
    import { VIDEO_OVERLAY_ASSET_APP } from '../app';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage asset={VIDEO_OVERLAY_ASSET_APP} single>
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

<style>
    :global(body) {
        background: none !important;
    }
</style>

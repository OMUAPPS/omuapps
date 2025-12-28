<script>
    import { AssetPage } from '@omujs/ui';
    import { ASSET_APP } from '../app';
    import AssetApp from './AssetApp.svelte';

</script>

<AssetPage asset={ASSET_APP} single>
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

<style>
    :global(body) {
        background: transparent !important;
    }
</style>

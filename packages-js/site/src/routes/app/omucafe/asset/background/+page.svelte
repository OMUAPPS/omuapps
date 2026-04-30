<script>
    import { AssetPage } from '@omujs/ui';
    import { OMUCAFE_BACKGROUND_APP } from '../../app';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage asset={OMUCAFE_BACKGROUND_APP} single>
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

<style>
    :global(body) {
        background: transparent !important;
    }
</style>

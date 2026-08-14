<script lang='ts'>
    import { AssetPage } from '@omujs/ui';
    import { ASSET_APP } from '../app.js';
    import AssetCounter from './AssetCounter.svelte';
</script>

<AssetPage asset={ASSET_APP}>
    {#snippet children({ omu })}
        <AssetCounter {omu} />
    {/snippet}
</AssetPage>

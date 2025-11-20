<script lang="ts">
    import { AssetPage } from '@omujs/ui';
    import { ASSET_APP } from '../app.js';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage asset={ASSET_APP} >
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

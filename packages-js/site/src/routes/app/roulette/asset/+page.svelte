<script lang="ts">
    import '@fontsource/rocknroll-one';
    import { AssetPage } from '@omujs/ui';
    import { ASSET_APP } from '../app.js';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage asset={ASSET_APP} >
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

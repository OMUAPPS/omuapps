<script lang="ts">
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { ASSET_APP } from '../app.js';
    import AssetApp from './AssetApp.svelte';

</script>

<AssetPage asset={ASSET_APP} let:omu>
    <AssetApp {omu} />
</AssetPage>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }
</style>

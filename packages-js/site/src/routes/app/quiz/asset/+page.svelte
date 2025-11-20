<script lang="ts">
    import { AssetPage } from '@omujs/ui';
    import { QUIZ_ASSET_APP } from '../app';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage asset={QUIZ_ASSET_APP} >
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

<style lang="scss">
    :global(body) {
        background: transparent;
    }
</style>

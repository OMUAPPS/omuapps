<script lang="ts">
    import { AssetPage } from '@omujs/ui';
    import { ASSET_APP } from '../app.js';
    import AssetApp from './AssetApp.svelte';

</script>

<AssetPage asset={ASSET_APP}>
    {#snippet children({ omu })}
        <AssetApp {omu} />
    {/snippet}
</AssetPage>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }
</style>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
        href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet"
    />
</svelte:head>

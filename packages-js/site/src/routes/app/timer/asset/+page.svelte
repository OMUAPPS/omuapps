<script lang="ts">
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { ASSET_APP } from '../app.js';
    import { TimerApp } from '../timer-app.js';
    import AssetApp from './AssetApp.svelte';
</script>

<AssetPage
    asset={ASSET_APP}
    create={(omu) => new TimerApp(omu)}
    let:omu
    let:app>
    <AssetApp {omu} timer={app} />
</AssetPage>

<style>
    :global(body) {
        background: transparent !important;
    }
</style>

<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { RemoteApp } from '../remote-app.js';
    import AssetApp from './AssetApp.svelte';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const remote = new RemoteApp(omu);
    setClient(omu);


    if (BROWSER) {
        omu.start();
    }

    const promise = new Promise<void>((resolve) => omu.onReady(resolve));
</script>

<AssetPage>
    {#await promise then}
        <AssetApp {omu} {remote} />
    {/await}
</AssetPage>

<style lang="scss">
    :global(body) {
        background: transparent !important;
    }
</style>

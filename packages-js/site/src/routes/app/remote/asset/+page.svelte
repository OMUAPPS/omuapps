<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { RemoteApp } from '../remote-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const { config } = new RemoteApp(omu);
    setClient(omu);


    if (BROWSER) {
        omu.start();
    }
</script>

<AssetPage>
    <main>
        {#if $config.show}
            {@const { show } = $config}
            <img src={omu.assets.url(show.asset)} alt="">
        {/if}
    </main>
</AssetPage>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    :global(body) {
        background: transparent !important;
    }

    img {
        position: absolute;
        inset: 0;
        margin: auto;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
</style>
